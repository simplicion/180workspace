'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    FolderKanban, Magnet, Target, CheckSquare,
    Building2, Receipt, UserSquare, Clock
} from 'lucide-react';
import clsx from 'clsx';

const ICON_MAP: Record<string, any> = {
    Project: FolderKanban,
    Lead: Magnet,
    Opportunity: Target,
    Task: CheckSquare,
    Client: Building2,
    Invoice: Receipt,
    User: UserSquare
};

interface RecentItemProps {
    recordId: string;
    type: string;
    label: string;
    href: string;
    icon?: string;
    viewedAt: string;
    isExpanded?: boolean;
}

export default function RecentItem({ type, label, href, viewedAt, isExpanded = true }: RecentItemProps) {
    const pathname = usePathname();
    const isActive = pathname === href;
    const Icon = ICON_MAP[type] || Clock;

    return (
        <Link
            href={href || '#'}
            className={clsx(
                "flex items-center gap-3 p-2 rounded-xl text-xs transition-all duration-300 relative group/recent",
                !isExpanded && "justify-center",
                isActive
                    ? "bg-gray-50/80 text-indigo-700 shadow-sm ring-1 ring-indigo-100/50 font-medium"
                    : "text-gray-500 hover:bg-white/50 hover:backdrop-blur-sm hover:text-gray-900"
            )}
            title={!isExpanded ? `${label} (${type})` : undefined}
        >
            <div className={clsx(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 flex-shrink-0 origin-center",
                isActive
                    ? "bg-white shadow-md text-indigo-600 scale-105"
                    : "bg-gray-50 text-gray-400 group-hover/recent:bg-white/80 group-hover/recent:shadow-sm group-hover/recent:text-indigo-500 group-hover/recent:scale-110"
            )}>
                <Icon className="w-4 h-4" />
            </div>

            {isExpanded && (
                <div className="flex-1 min-w-0 animate-in fade-in slide-in-from-left-1 duration-300">
                    <p className={clsx(
                        "truncate font-semibold leading-tight",
                        isActive ? "text-indigo-700" : "text-gray-600 group-hover/recent:text-gray-900"
                    )}>
                        {label}
                    </p>
                    {type && (
                        <div className="flex items-center gap-1 mt-0.5 text-[10px] opacity-50">
                            <span className="capitalize">{type}</span>
                        </div>
                    )}
                </div>
            )}

            {isExpanded && (
                <div className={clsx(
                    "w-1 h-1 rounded-full bg-indigo-400 transition-all duration-300 opacity-0 group-hover/recent:opacity-100",
                    isActive && "opacity-100 scale-125 bg-indigo-600"
                )} />
            )}
        </Link>
    );
}
