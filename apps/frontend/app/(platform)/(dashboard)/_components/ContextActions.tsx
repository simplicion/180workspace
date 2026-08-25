'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface Action {
    label: string;
    icon: LucideIcon;
    onClick: (e: React.MouseEvent) => void;
    variant?: 'primary' | 'secondary' | 'danger';
    showLabel?: boolean;
}

interface ContextActionsProps {
    actions: Action[];
    className?: string;
}

export default function ContextActions({ actions, className }: ContextActionsProps) {
    return (
        <div className={clsx(
            "flex items-center gap-1 transition-all duration-200",
            className
        )}>
            {actions.map((action, i) => (
                <button
                    key={i}
                    onClick={(e) => {
                        e.stopPropagation();
                        action.onClick(e);
                    }}
                    title={action.label}
                    aria-label={action.label}
                    className={clsx(
                        "flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm border",
                        action.variant === 'primary' && "bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-700",
                        action.variant === 'danger' && "bg-red-50 border-red-100 text-red-600 hover:bg-red-100",
                        (!action.variant || action.variant === 'secondary') && "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                    )}
                >
                    <action.icon className="w-3.5 h-3.5" aria-hidden="true" />
                    {action.showLabel && <span>{action.label}</span>}
                </button>
            ))}
        </div>
    );
}
