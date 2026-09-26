'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/** Error state with a retry and a second recovery path (.agents/rules/ux-best-practices.md). */
export function ErrorPanel({
    title = 'Something went wrong',
    message,
    code,
    onRetry,
    retryLabel = 'Try again',
    secondary,
    compact,
}: {
    title?: string;
    message: string;
    code?: string;
    onRetry?: () => void;
    retryLabel?: string;
    secondary?: { label: string; onClick?: () => void; href?: string };
    compact?: boolean;
}) {
    return (
        <div
            role="alert"
            aria-live="polite"
            className={`rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/20 ${compact ? 'p-3' : 'p-5'} space-y-3`}
        >
            <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" />
                <div className="min-w-0">
                    <p className="text-sm font-bold text-rose-900 dark:text-rose-200">{title}</p>
                    <p className="text-xs text-rose-800/90 dark:text-rose-300/90 mt-0.5 break-words">{message}</p>
                    {code && <p className="text-[10px] font-mono text-rose-700/70 dark:text-rose-400/70 mt-1">{code}</p>}
                </div>
            </div>
            {(onRetry || secondary) && (
                <div className="flex flex-wrap gap-2">
                    {onRetry && (
                        <button
                            type="button"
                            onClick={onRetry}
                            className="inline-flex items-center gap-1.5 min-h-[44px] px-4 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-all duration-300"
                        >
                            <RefreshCw className="w-3.5 h-3.5" /> {retryLabel}
                        </button>
                    )}
                    {secondary && (secondary.href ? (
                        <a
                            href={secondary.href}
                            className="inline-flex items-center min-h-[44px] px-4 text-xs font-semibold rounded-xl border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-all duration-300"
                        >
                            {secondary.label}
                        </a>
                    ) : (
                        <button
                            type="button"
                            onClick={secondary.onClick}
                            className="inline-flex items-center min-h-[44px] px-4 text-xs font-semibold rounded-xl border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-all duration-300"
                        >
                            {secondary.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/** Empty state with an action. */
export function EmptyPanel({
    icon,
    title,
    message,
    action,
}: {
    icon?: React.ReactNode;
    title: string;
    message?: string;
    action?: { label: string; onClick: () => void; disabled?: boolean };
}) {
    return (
        <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/40">
            {icon && <div className="mx-auto mb-3 w-10 h-10 flex items-center justify-center text-slate-400 dark:text-zinc-500">{icon}</div>}
            <p className="text-sm font-bold text-slate-900 dark:text-zinc-100">{title}</p>
            {message && <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">{message}</p>}
            {action && (
                <button
                    type="button"
                    onClick={action.onClick}
                    disabled={action.disabled}
                    className="mt-4 inline-flex items-center min-h-[44px] px-5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all duration-300 disabled:opacity-50"
                >
                    {action.label}
                </button>
            )}
        </div>
    );
}

/** Small copy-to-clipboard button. */
export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
    const [copied, setCopied] = React.useState(false);
    return (
        <button
            type="button"
            onClick={async () => {
                try {
                    await navigator.clipboard.writeText(text);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                } catch {
                    setCopied(false);
                }
            }}
            className="inline-flex items-center min-h-[32px] px-2.5 text-[11px] font-semibold rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all duration-300 shrink-0"
            aria-label={`${label} to clipboard`}
        >
            {copied ? 'Copied' : label}
        </button>
    );
}
