"use client";
import { LogoLoader } from "./LogoLoader";
import { X, AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import clsx from 'clsx';

interface Props {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: (value?: string) => void;
    onCancel?: () => void;
    loading?: boolean;
    variant?: 'danger' | 'warning' | 'info' | 'success';
    type?: 'confirm' | 'alert' | 'prompt';
    defaultValue?: string;
    placeholder?: string;
    customActions?: {
        label: string;
        onClick: () => Promise<void> | void;
        className?: string;
    }[];
}

export default function ConfirmModal({
    isOpen,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    loading = false,
    variant = 'danger',
    type = 'confirm',
    defaultValue = '',
    placeholder = 'Enter value...',
    customActions
}: Props) {
    const [promptValue, setPromptValue] = useState(defaultValue);

    useEffect(() => {
        if (isOpen) setPromptValue(defaultValue);
    }, [isOpen, defaultValue]);

    if (!isOpen) return null;

    const variantStyles = {
        danger: {
            bg: 'bg-red-50',
            border: 'border-red-100',
            icon: 'text-red-600',
            btn: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
            Icon: AlertCircle
        },
        warning: {
            bg: 'bg-amber-50',
            border: 'border-amber-100',
            icon: 'text-amber-600',
            btn: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
            Icon: AlertTriangle
        },
        info: {
            bg: 'bg-blue-50',
            border: 'border-blue-100',
            icon: 'text-blue-600',
            btn: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
            Icon: Info
        },
        success: {
            bg: 'bg-emerald-50',
            border: 'border-emerald-100',
            icon: 'text-emerald-600',
            btn: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500',
            Icon: CheckCircle
        }
    };

    const currentVariant = variantStyles[variant];
    const { Icon } = currentVariant;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                {/* Header/Icon */}
                <div className="p-6 text-center">
                    <div className={clsx(
                        "w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 border",
                        currentVariant.bg,
                        currentVariant.border
                    )}>
                        <Icon className={clsx("w-6 h-6", currentVariant.icon)} />
                    </div>

                    <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
                    <p className="text-gray-500 text-sm leading-relaxed mb-4">{message}</p>

                    {type === 'prompt' && (
                        <input
                            autoFocus
                            type="text"
                            value={promptValue}
                            onChange={(e) => setPromptValue(e.target.value)}
                            placeholder={placeholder}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-sm"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !loading) onConfirm(promptValue);
                                if (e.key === 'Escape' && onCancel) onCancel();
                            }}
                        />
                    )}
                </div>

                {/* Actions */}
                <div className="px-6 py-4 bg-gray-50 flex flex-col sm:flex-row items-center justify-center gap-3">
                    {type !== 'alert' && (
                        <button
                            onClick={onCancel}
                            disabled={loading}
                            className="w-full sm:w-auto flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            {cancelText}
                        </button>
                    )}
                    {customActions ? (
                        <>
                            {customActions.map((action, i) => (
                                <button
                                    key={i}
                                    onClick={action.onClick}
                                    disabled={loading}
                                    className={clsx(
                                        "w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-semibold transition-all focus:ring-2 focus:ring-offset-2 disabled:opacity-50 flex items-center justify-center gap-2",
                                        action.className || currentVariant.btn
                                    )}
                                >
                                    {loading && <LogoLoader className="w-4 h-4 animate-spin" />}
                                    {action.label}
                                </button>
                            ))}
                        </>
                    ) : (
                        <button
                            onClick={() => onConfirm(type === 'prompt' ? promptValue : undefined)}
                            disabled={loading}
                            className={clsx(
                                "w-full sm:w-auto px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all focus:ring-2 focus:ring-offset-2 disabled:opacity-50 flex items-center justify-center gap-2",
                                type !== 'alert' ? "flex-1" : "min-w-[120px]",
                                currentVariant.btn
                            )}
                        >
                            {loading && <LogoLoader className="w-4 h-4 animate-spin" />}
                            {confirmText}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
