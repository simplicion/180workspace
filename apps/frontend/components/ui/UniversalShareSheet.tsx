import React, { useState } from 'react';
import BottomSheet from './BottomSheet';
import { Copy, Check, Twitter, Linkedin, MessageCircle, Share2, Mail } from 'lucide-react';

interface UniversalShareSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  url: string;
  shareText?: string;
}

export default function UniversalShareSheet({ isOpen, onClose, title = "Share", url, shareText }: UniversalShareSheetProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const shareOptions = [
    {
      name: 'WhatsApp',
      icon: <MessageCircle className="w-5 h-5 text-green-500" />,
      action: () => window.open(`https://wa.me/?text=${encodeURIComponent(shareText || title)}%20${encodeURIComponent(url)}`, '_blank')
    },
    {
      name: 'Twitter',
      icon: <Twitter className="w-5 h-5 text-blue-400" />,
      action: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText || title)}&url=${encodeURIComponent(url)}`, '_blank')
    },
    {
      name: 'LinkedIn',
      icon: <Linkedin className="w-5 h-5 text-blue-700" />,
      action: () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank')
    },
    {
      name: 'Email',
      icon: <Mail className="w-5 h-5 text-gray-600" />,
      action: () => window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`, '_blank')
    }
  ];

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Share">
      <div className="p-4 flex flex-col gap-6">
        
        {/* Share Icons Grid */}
        <div className="grid grid-cols-4 gap-4">
          {shareOptions.map((option) => (
            <button
              key={option.name}
              onClick={option.action}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
                {option.icon}
              </div>
              <span className="text-xs font-medium text-gray-600">{option.name}</span>
            </button>
          ))}
        </div>

        {/* Copy Link Section */}
        <div className="flex flex-col gap-2 pt-4 border-t border-gray-100">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Page Link</span>
          <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex-1 overflow-hidden">
              <p className="text-sm text-gray-600 truncate whitespace-nowrap">{url}</p>
            </div>
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors shrink-0"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
        
      </div>
    </BottomSheet>
  );
}
