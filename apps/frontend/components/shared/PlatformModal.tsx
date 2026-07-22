'use client';

import { X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

export interface PlatformModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: React.ReactNode;
    icon?: React.ElementType;
    iconColorClass?: string;
    iconBgClass?: string;
    subHeader?: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    maxWidthClass?: string;
    onSubmit?: (e: React.FormEvent) => void;
    bodyClassName?: string;
}

export function PlatformModal({
    isOpen,
    onClose,
    title,
    icon: Icon,
    iconColorClass = 'text-indigo-600',
    iconBgClass = 'bg-indigo-50',
    subHeader,
    children,
    footer,
    maxWidthClass = 'max-w-lg',
    onSubmit,
    bodyClassName = 'space-y-4'
}: PlatformModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Handle escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!mounted || !isOpen) return null;

    const BodyWrapper = onSubmit ? 'form' : 'div';
    
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidthClass} max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200`}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        {Icon && (
                            <div className={`w-9 h-9 rounded-xl ${iconBgClass} flex items-center justify-center flex-shrink-0`}>
                                <Icon className={`w-4 h-4 ${iconColorClass}`} />
                            </div>
                        )}
                        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                    </div>
                    <button 
                        onClick={onClose} 
                        type="button"
                        aria-label="Close modal" 
                        title="Close modal" 
                        className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors flex-shrink-0"
                    >
                        <X className="w-4 h-4 text-gray-500" aria-hidden="true" />
                    </button>
                </div>

                {subHeader && (
                    <div className="flex-shrink-0">
                        {subHeader}
                    </div>
                )}

                <BodyWrapper 
                    onSubmit={onSubmit} 
                    className={`flex-1 overflow-y-auto px-6 py-5 custom-scrollbar ${bodyClassName}`}
                >
                    {children}
                </BodyWrapper>

                {footer && (
                    <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 flex-shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
