'use client';

import { LogoLoader } from "@workspace/ui";
import { motion } from 'framer-motion';
import { Trash2, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { useEffect } from 'react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading?: boolean;
    variant?: 'danger' | 'primary';
}

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, isLoading, variant = 'primary' }: ConfirmModalProps) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
                <div className="p-8 text-center">
                    <div className={clsx(
                        "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6",
                        variant === 'danger' ? "bg-red-50 text-red-500" : "bg-indigo-50 text-indigo-500"
                    )}>
                        {variant === 'danger' ? <Trash2 className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
                    </div>
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter mb-2">{title}</h3>
                    <p className="text-sm text-gray-500 font-medium leading-relaxed">{message}</p>
                </div>
                <div className="flex bg-gray-50/50">
                    <button 
                        onClick={onCancel}
                        disabled={isLoading}
                        className="flex-1 py-4 text-sm font-black text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all uppercase tracking-widest border-r border-gray-100/50"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={clsx(
                            "flex-1 py-4 text-sm font-black transition-all uppercase tracking-widest flex items-center justify-center gap-2",
                            variant === 'danger' ? "text-red-600 hover:bg-red-100" : "text-indigo-600 hover:bg-indigo-100"
                        )}
                    >
                        {isLoading ? <LogoLoader className="w-4 h-4 animate-spin" /> : "Confirm"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
