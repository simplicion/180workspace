import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DrawerProps {
    isOpen?: boolean;
    open?: boolean;
    onClose: () => void;
    title: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    maxWidth?: string; // e.g. 'max-w-md', 'max-w-xl'
    size?: string;
    position?: string;
    icon?: React.ReactNode;
    description?: React.ReactNode;
}

export function Drawer({ 
    isOpen, 
    open, 
    onClose, 
    title, 
    children, 
    footer, 
    maxWidth = 'max-w-md',
    size,
    position = 'right',
    icon,
    description
}: DrawerProps) {
    const show = isOpen ?? open;
    const widthClass = size || maxWidth;
    const isLeft = position === 'left';

    const slideVariants = {
        hidden: { x: isLeft ? '-100%' : '100%' },
        visible: { x: 0 },
        exit: { x: isLeft ? '-100%' : '100%' }
    };

    return (
        <AnimatePresence>
            {show && (
                <div className={`fixed inset-0 z-[100] flex ${isLeft ? 'justify-start' : 'justify-end'}`}>
                    <motion.div
                        className="absolute inset-0 bg-black/50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                    />
                    <motion.div 
                        className={`relative bg-white w-full ${widthClass} h-full shadow-2xl flex flex-col`}
                        variants={slideVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    >
                        <div className="p-6 border-b border-gray-100 flex items-start justify-between shrink-0">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    {icon && <span className="text-gray-500">{icon}</span>}
                                    <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                                </div>
                                {description && <p className="text-sm text-gray-500">{description}</p>}
                            </div>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors shrink-0" title="Close">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
                            {children}
                        </div>

                        {footer && (
                            <div className="p-6 border-t border-gray-100 bg-gray-50 shrink-0">
                                {footer}
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
