"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Info, HelpCircle } from 'lucide-react';
import clsx from 'clsx';

export interface InfoTooltipProps {
  content: React.ReactNode;
  title?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  iconClassName?: string;
  icon?: 'info' | 'help';
  size?: 'sm' | 'md';
}

export default function InfoTooltip({
  content,
  title,
  position = 'top',
  className,
  iconClassName,
  icon = 'info',
  size = 'sm'
}: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setIsVisible(false);
      }
    };
    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible]);

  const IconComponent = icon === 'help' ? HelpCircle : Info;

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-zinc-900',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 -mb-1 border-4 border-transparent border-b-gray-900 dark:border-b-zinc-900',
    left: 'left-full top-1/2 -translate-y-1/2 -ml-1 border-4 border-transparent border-l-gray-900 dark:border-l-zinc-900',
    right: 'right-full top-1/2 -translate-y-1/2 -mr-1 border-4 border-transparent border-r-gray-900 dark:border-r-zinc-900'
  };

  return (
    <div
      ref={triggerRef}
      className={clsx("relative inline-flex items-center align-middle", className)}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onClick={() => setIsVisible(!isVisible)}
    >
      <button
        type="button"
        aria-label={title || "More information"}
        className={clsx(
          "p-0.5 rounded-full text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-zinc-800/80 transition-colors focus:outline-none",
          iconClassName
        )}
      >
        <IconComponent
          className={clsx(
            size === 'sm' ? "w-3.5 h-3.5" : "w-4 h-4",
            "stroke-[2.2]"
          )}
        />
      </button>

      {isVisible && (
        <div
          role="tooltip"
          className={clsx(
            "absolute z-[9999] w-64 max-w-xs p-2.5 bg-gray-900/95 dark:bg-zinc-900/95 text-white dark:text-zinc-100 text-[11px] leading-relaxed rounded-xl shadow-xl backdrop-blur-sm border border-gray-800 dark:border-zinc-800 pointer-events-none animate-in fade-in zoom-in-95 duration-150",
            positionClasses[position]
          )}
        >
          {title && (
            <div className="font-bold text-gray-200 dark:text-zinc-200 mb-1 text-xs border-b border-gray-700/60 dark:border-zinc-800 pb-1">
              {title}
            </div>
          )}
          <div className="text-gray-300 dark:text-zinc-300 font-normal">
            {content}
          </div>
          <div className={clsx("absolute", arrowClasses[position])} />
        </div>
      )}
    </div>
  );
}
