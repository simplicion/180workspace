'use client';

import React, { useState } from 'react';
import { Copy, Check, Code2, Sparkles, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';

interface MarkdownRendererProps {
    content: string;
    isUser?: boolean;
}

export function MarkdownRenderer({ content, isUser = false }: MarkdownRendererProps) {
    if (!content) return null;

    if (isUser) {
        return <div className="whitespace-pre-wrap">{content}</div>;
    }

    // Direct Action Card Interceptor: If entire text is raw action JSON, render directive card directly
    try {
        const trimmed = content.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}') && trimmed.includes('"action"')) {
            const parsed = JSON.parse(trimmed);
            if (parsed.action) {
                const actionName = parsed.action.replace(/_/g, ' ');
                const payload = parsed.payload || {};
                const targetName = payload.name || payload.title || payload.clientName || payload.description || '';
                return (
                    <div className="my-1.5 p-3.5 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/40 text-white shadow-md flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-300">
                                <Sparkles className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="text-xs font-bold capitalize text-slate-100 flex items-center gap-1.5">
                                    <span>{actionName}</span>
                                    {targetName && <span className="text-indigo-300 font-semibold">"{targetName}"</span>}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                    Autonomous Action Processed
                                </div>
                            </div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Executed</span>
                        </span>
                    </div>
                );
            }
        }
    } catch {}

    // Split text into code blocks and normal markdown segments
    const parts = content.split(/(```[\s\S]*?```)/g);

    return (
        <div className="space-y-2.5 text-sm leading-relaxed text-slate-800">
            {parts.map((part, index) => {
                if (part.startsWith('```')) {
                    return <CodeBlock key={index} codeText={part} />;
                }
                return <MarkdownSection key={index} text={part} />;
            })}
        </div>
    );
}

function CodeBlock({ codeText }: { codeText: string }) {
    const [copied, setCopied] = useState(false);
    const match = codeText.match(/^```(\w+)?\n?([\s\S]*?)```$/);
    const language = match?.[1] || 'code';
    const code = (match?.[2] || codeText.slice(3, -3)).trim();

    // Smart Interceptor: If this is an AI action JSON block, render a sleek execution directive card
    try {
        if (code.startsWith('{') && code.includes('"action"')) {
            const parsed = JSON.parse(code);
            if (parsed.action) {
                const actionName = parsed.action.replace(/_/g, ' ');
                const payload = parsed.payload || {};
                const targetName = payload.name || payload.title || payload.clientName || payload.description || '';
                return (
                    <div className="my-2.5 p-3.5 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/40 text-white shadow-md flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-300">
                                <Sparkles className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="text-xs font-bold capitalize text-slate-100 flex items-center gap-1.5">
                                    <span>{actionName}</span>
                                    {targetName && <span className="text-indigo-300 font-semibold">"{targetName}"</span>}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                    Autonomous Action Processed
                                </div>
                            </div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Executed</span>
                        </span>
                    </div>
                );
            }
        }
    } catch (e) {
        // Fallback to normal code block rendering
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="my-3 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 text-slate-100 font-mono text-xs shadow-md">
            <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-800/80 border-b border-slate-700 text-slate-400 text-[11px]">
                <div className="flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="uppercase tracking-wider font-semibold text-[10px] text-slate-300">{language}</span>
                </div>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                    title="Copy code"
                >
                    {copied ? (
                        <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                        </>
                    ) : (
                        <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                        </>
                    )}
                </button>
            </div>
            <pre className="p-3.5 overflow-x-auto text-slate-200 custom-scrollbar leading-relaxed">
                <code>{code}</code>
            </pre>
        </div>
    );
}

function MarkdownSection({ text }: { text: string }) {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let currentList: { type: 'ul' | 'ol'; items: React.ReactNode[] } | null = null;

    const flushList = () => {
        if (currentList) {
            if (currentList.type === 'ul') {
                elements.push(
                    <ul key={`ul-${elements.length}`} className="my-2 space-y-1.5 pl-1">
                        {currentList.items.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-slate-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0"></span>
                                <div className="flex-1">{item}</div>
                            </li>
                        ))}
                    </ul>
                );
            } else {
                elements.push(
                    <ol key={`ol-${elements.length}`} className="my-2 space-y-1.5 pl-1 list-none counter-reset">
                        {currentList.items.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-slate-700">
                                <span className="font-semibold text-indigo-600 text-xs mt-0.5 shrink-0 min-w-[16px]">{i + 1}.</span>
                                <div className="flex-1">{item}</div>
                            </li>
                        ))}
                    </ol>
                );
            }
            currentList = null;
        }
    };

    lines.forEach((line, lineIndex) => {
        const trimmed = line.trim();

        if (!trimmed) {
            flushList();
            return;
        }

        // Headers
        if (trimmed.startsWith('#### ')) {
            flushList();
            elements.push(
                <h5 key={`h4-${lineIndex}`} className="font-bold text-slate-900 text-xs mt-3 mb-1 tracking-tight">
                    {formatInline(trimmed.slice(5))}
                </h5>
            );
            return;
        }
        if (trimmed.startsWith('### ')) {
            flushList();
            elements.push(
                <h4 key={`h3-${lineIndex}`} className="font-bold text-slate-900 text-sm mt-3.5 mb-1.5 tracking-tight">
                    {formatInline(trimmed.slice(4))}
                </h4>
            );
            return;
        }
        if (trimmed.startsWith('## ')) {
            flushList();
            elements.push(
                <h3 key={`h2-${lineIndex}`} className="font-bold text-slate-900 text-base mt-4 mb-2 tracking-tight">
                    {formatInline(trimmed.slice(3))}
                </h3>
            );
            return;
        }
        if (trimmed.startsWith('# ')) {
            flushList();
            elements.push(
                <h2 key={`h1-${lineIndex}`} className="font-extrabold text-slate-900 text-lg mt-4 mb-2 tracking-tight">
                    {formatInline(trimmed.slice(2))}
                </h2>
            );
            return;
        }

        // Blockquotes
        if (trimmed.startsWith('> ')) {
            flushList();
            elements.push(
                <div key={`quote-${lineIndex}`} className="my-2 p-3 border-l-3 border-indigo-500 bg-indigo-50/50 rounded-r-lg text-slate-700 italic text-xs">
                    {formatInline(trimmed.slice(2))}
                </div>
            );
            return;
        }

        // Unordered List Items (- or * or •)
        const ulMatch = trimmed.match(/^[-*•]\s+(.*)$/);
        if (ulMatch) {
            if (!currentList || currentList.type !== 'ul') {
                flushList();
                currentList = { type: 'ul', items: [] };
            }
            currentList.items.push(formatInline(ulMatch[1]));
            return;
        }

        // Ordered List Items (1. , 2. )
        const olMatch = trimmed.match(/^\d+\.\s+(.*)$/);
        if (olMatch) {
            if (!currentList || currentList.type !== 'ol') {
                flushList();
                currentList = { type: 'ol', items: [] };
            }
            currentList.items.push(formatInline(olMatch[1]));
            return;
        }

        // Normal paragraph line
        flushList();
        elements.push(
            <p key={`p-${lineIndex}`} className="leading-relaxed">
                {formatInline(line)}
            </p>
        );
    });

    flushList();
    return <>{elements}</>;
}

/**
 * Parses inline formatting: **bold**, *italic*, `code`, and [links](url)
 */
function formatInline(text: string): React.ReactNode {
    if (!text) return text;

    // Tokenize bold, code, italic, links with exact non-greedy matching
    const tokenRegex = /(\*\*(?:(?!\*\*).)+?\*\*|`[^`\n]+?`|\*(?:(?!\*).)+?\*|\[[^\]\n]+?\]\([^)\n]+?\))/g;
    const parts = text.split(tokenRegex);

    return parts.map((part, i) => {
        if (!part) return null;

        // Bold: **text**
        if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
            const inner = part.slice(2, -2);
            return (
                <strong key={i} className="font-bold text-slate-900">
                    {formatInline(inner)}
                </strong>
            );
        }

        // Inline Code: `code`
        if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
            const inner = part.slice(1, -1);
            return (
                <code key={i} className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-100 text-indigo-700 font-mono text-xs border border-slate-200/80 font-medium">
                    {inner}
                </code>
            );
        }

        // Italic: *text*
        if (part.startsWith('*') && part.endsWith('*') && part.length >= 2 && !part.startsWith('**')) {
            const inner = part.slice(1, -1);
            return (
                <em key={i} className="italic text-slate-800">
                    {formatInline(inner)}
                </em>
            );
        }

        // Markdown Link: [label](url)
        const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (linkMatch) {
            return (
                <a
                    key={i}
                    href={linkMatch[2]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800 underline font-medium"
                >
                    {linkMatch[1]}
                </a>
            );
        }

        return part;
    });
}
