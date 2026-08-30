import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import clsx from 'clsx';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; }
  }, [isOpen]);

  if (!mounted) return null;

  return createPortal(
    <div 
      className={clsx(
        "fixed inset-0 z-[9999] flex items-end justify-center transition-opacity duration-300", 
        isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}
    >
      {/* Backdrop */}
      <div 
        className={clsx(
          "fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300", 
          isOpen ? "opacity-100" : "opacity-0"
        )} 
        onClick={onClose} 
      />
      
      {/* Sheet */}
      <div 
        className={clsx(
          "relative w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl shadow-xl transition-transform duration-300 transform z-10 border-t border-gray-100 dark:border-gray-800", 
          isOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
