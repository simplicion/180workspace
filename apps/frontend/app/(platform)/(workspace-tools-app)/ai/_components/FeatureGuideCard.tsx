'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Compass, ExternalLink, CheckCircle, Copy, Check } from 'lucide-react';

export interface FeatureGuideCardProps {
    title: string;
    app: string;
    url: string;
    steps: string[];
    onNavigate?: (url: string) => void;
}

export const FeatureGuideCard: React.FC<FeatureGuideCardProps> = ({
    title,
    app,
    url,
    steps = [],
    onNavigate
}) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        const text = `${title}\n\n` + steps.map((s, idx) => `Step ${idx + 1}: ${s}`).join('\n') + `\n\nShortcut: ${url}`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="my-3 w-full max-w-2xl rounded-2xl border border-sky-500/30 bg-gradient-to-br from-slate-900/90 via-sky-950/20 to-slate-900/90 p-5 shadow-xl backdrop-blur-md transition-all duration-300 hover:border-sky-500/50 hover:shadow-sky-500/10">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400 shadow-inner">
                        <Compass className="h-5 w-5 animate-pulse" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="rounded-full bg-sky-500/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-300 border border-sky-500/30">
                                {app}
                            </span>
                            <span className="text-xs text-slate-400">Step-by-Step Walkthrough</span>
                        </div>
                        <h4 className="mt-0.5 text-sm font-bold text-white tracking-tight">{title}</h4>
                    </div>
                </div>

                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                    title="Copy guide steps"
                >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
            </div>

            {/* Steps List */}
            <div className="mt-4 space-y-2.5">
                {steps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-3 rounded-xl bg-white/[0.03] p-2.5 border border-white/[0.05]">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500/30 text-[10px] font-bold text-sky-200">
                            {idx + 1}
                        </span>
                        <p className="text-xs leading-relaxed text-slate-200 font-normal">
                            {step}
                        </p>
                    </div>
                ))}
            </div>

            {/* Direct Action Shortcut */}
            {url && (
                <div className="mt-4 flex items-center justify-between rounded-xl bg-sky-500/10 border border-sky-500/20 px-3.5 py-2.5">
                    <div className="flex items-center gap-2 text-xs text-sky-200">
                        <CheckCircle className="h-4 w-4 text-sky-400" />
                        <span>Ready to try it? Jump directly to the feature:</span>
                    </div>

                    <Link
                        href={url}
                        onClick={() => onNavigate?.(url)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-sky-500/30 transition-all hover:bg-sky-400 hover:shadow-sky-500/50"
                    >
                        <span>Open {app}</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                </div>
            )}
        </div>
    );
};
