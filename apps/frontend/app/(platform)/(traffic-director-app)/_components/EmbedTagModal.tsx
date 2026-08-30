"use client";

import { useState } from 'react';
import { Copy, Check, Code, Shield, ExternalLink, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { Drawer } from '@/components/ui/Drawer';

interface EmbedTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  linkName: string;
}

export default function EmbedTagModal({ isOpen, onClose, slug, linkName }: EmbedTagModalProps) {
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4002';

  const scriptTagCode = `<script src="${apiBase}/tag/${slug}.js" async></script>`;
  const shieldUrl = `${apiBase}/shield/${slug}`;
  const directUrl = `${apiBase}/r/${slug}`;
  const iframeCode = `<iframe src="${shieldUrl}" width="300" height="250" frameborder="0" scrolling="no"></iframe>`;

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Embed Codes & Routing Endpoints"
      description={`${linkName} (/r/${slug})`}
      icon={<Code className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
      maxWidth="max-w-xl"
      position="right"
      footer={
        <div className="flex items-center justify-end w-full">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"
          >
            Close
          </button>
        </div>
      }
    >
      <div className="space-y-5 p-1">
        {/* 1. Client-Side Shield Gateway */}
        <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/50 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-bold text-gray-900 dark:text-white">Client-Side Hardware Shield Gateway</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
              Recommended
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Executes client-side hardware GPU, touchscreen, and battery verification before redirecting. Unmasks headless cloud scrapers and emulators.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              readOnly
              value={shieldUrl}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-mono text-gray-800 dark:text-gray-200 select-all"
            />
            <button
              onClick={() => copyToClipboard(shieldUrl, 'shield')}
              className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium flex items-center gap-1.5 shrink-0 transition"
            >
              {copiedType === 'shield' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              Copy
            </button>
          </div>
        </div>

        {/* 2. Direct Server Redirect */}
        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-bold text-gray-900 dark:text-white">Direct Server Redirect (/r/:slug)</span>
            </div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
              Sub-3ms Edge
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Lightning-fast server-side 302 HTTP redirection based on IP intelligence, datacenter ASN lookup, and headers.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              readOnly
              value={directUrl}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-mono text-gray-800 dark:text-gray-200 select-all"
            />
            <button
              onClick={() => copyToClipboard(directUrl, 'direct')}
              className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium flex items-center gap-1.5 shrink-0 transition"
            >
              {copiedType === 'direct' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              Copy
            </button>
          </div>
        </div>

        {/* 3. Dynamic Ad-Tag JavaScript */}
        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-bold text-gray-900 dark:text-white">Dynamic Ad Tag JS Script</span>
            </div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300">
              Ad Network Safe
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Self-executing tag for Google Ads, Meta Ads, and programmatic DSP creative placements.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              readOnly
              value={scriptTagCode}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-mono text-gray-800 dark:text-gray-200 select-all"
            />
            <button
              onClick={() => copyToClipboard(scriptTagCode, 'script')}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center gap-1.5 shrink-0 transition"
            >
              {copiedType === 'script' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              Copy
            </button>
          </div>
        </div>

        {/* 4. iFrame Sandbox */}
        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-bold text-gray-900 dark:text-white">Sandboxed iFrame Embed</span>
            </div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300">
              Native Placement
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            For embedding within banner ad placements, web games, or publisher widgets.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              readOnly
              value={iframeCode}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-mono text-gray-800 dark:text-gray-200 select-all"
            />
            <button
              onClick={() => copyToClipboard(iframeCode, 'iframe')}
              className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium flex items-center gap-1.5 shrink-0 transition"
            >
              {copiedType === 'iframe' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              Copy
            </button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
