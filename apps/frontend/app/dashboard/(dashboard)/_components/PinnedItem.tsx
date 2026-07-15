'use strict';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LucideIcon, Star, X, PinOff } from 'lucide-react';
import * as Icons from 'lucide-react';
import { clsx } from 'clsx';

interface PinnedItemProps {
    recordId: string;
    type: string;
    label: string;
    href: string;
    icon?: string;
    isExpanded?: boolean;
    onRemove: (recordId: string, type: string) => void;
}

const PinnedItem: React.FC<PinnedItemProps> = ({ recordId, type, label, href, icon, isExpanded = true, onRemove }) => {
    const pathname = usePathname();
    const isActive = pathname === href || pathname.startsWith(href + '/');

    // Resolve icon if it's a string (for modules)
    const DynamicIcon = icon ? (Icons as any)[icon] : null;

    return (
        <div className="relative group/pin">
            <Link
                href={href || '#'}
                className={clsx(
                    "flex items-center gap-3 p-2 rounded-xl text-xs transition-all duration-300 relative overflow-hidden",
                    !isExpanded && "justify-center",
                    isActive
                        ? "bg-indigo-50/80 text-indigo-700 shadow-sm ring-1 ring-indigo-100/50"
                        : "text-gray-500 hover:bg-white/50 hover:backdrop-blur-sm hover:text-gray-900"
                )}
                title={!isExpanded ? `${label} (${type})` : undefined}
            >
                {/* Modern active indicator */}
                {isActive && (
                    <div className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-500 rounded-full" />
                )}

                <div className={clsx(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 flex-shrink-0 origin-center",
                    isActive
                        ? "bg-white shadow-md text-indigo-600 rotate-6 scale-110"
                        : "bg-gray-50 text-gray-400 group-hover/pin:bg-white/80 group-hover/pin:shadow-sm group-hover/pin:text-indigo-500 group-hover/pin:rotate-3 group-hover/pin:scale-105"
                )}>
                    {DynamicIcon ? <DynamicIcon className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                </div>

                {isExpanded && (
                    <div className="flex-1 min-w-0 animate-in fade-in slide-in-from-left-1 duration-300">
                        <p className={clsx(
                            "truncate leading-tight transition-colors",
                            isActive ? "font-bold" : "font-semibold text-gray-600 group-hover/pin:text-gray-900"
                        )}>
                            {label}
                        </p>
                        <p className="text-[10px] opacity-50 truncate mt-0.5">{type}</p>
                    </div>
                )}
            </Link>

            {isExpanded && (
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onRemove(recordId, type);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-white/80 backdrop-blur-sm shadow-sm border border-gray-100 text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover/pin:opacity-100 transition-all duration-200 z-10"
                    title="Remove pinpoint"
                >
                    <PinOff className="w-3 h-3" />
                </button>
            )}
        </div>
    );
};

export default PinnedItem;
