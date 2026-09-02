'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ElementNode } from '../../types';
import { Code2, Play, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';

interface CodeElementProps {
    element: ElementNode;
    isReadOnly?: boolean;
}

export default function CodeElement({ element, isReadOnly = false }: CodeElementProps) {
    const html = element.data?.html || '';
    const containerRef = useRef<HTMLDivElement>(null);
    const editorPreviewRef = useRef<HTMLDivElement>(null);
    const [showPreview, setShowPreview] = useState(true);

    // Analyze content for detected tracking pixels and widgets
    const hasScriptTag = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(html);
    const hasMetaPixel = /fbq\(|facebook\.com\/tr\?/i.test(html);
    const hasGoogleAnalytics = /gtag\(|google-analytics\.com|googletagmanager\.com/i.test(html);
    const hasTikTokPixel = /ttq\./i.test(html);
    const hasIframe = /<iframe\b/i.test(html);
    const hasStyle = /<style\b/i.test(html);

    // Determine if we have renderable visual content (iframes, divs, images — not just scripts/pixels)
    const hasVisualContent = hasIframe || /<(div|span|img|form|table|ul|ol|section|article|aside|nav|video|audio|embed|object)\b/i.test(html);

    // ─── Live Execution on Public Pages / Preview ────────────────────────────
    useEffect(() => {
        if (!isReadOnly || !html.trim() || !containerRef.current) return;

        const container = containerRef.current;
        const scriptElements: HTMLScriptElement[] = [];

        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // 1. Process and execute all <script> tags
            const scripts = doc.querySelectorAll('script');
            scripts.forEach((oldScript) => {
                const newScript = document.createElement('script');
                Array.from(oldScript.attributes).forEach((attr) => {
                    newScript.setAttribute(attr.name, attr.value);
                });
                if (oldScript.innerHTML) {
                    newScript.textContent = oldScript.innerHTML;
                }
                container.appendChild(newScript);
                scriptElements.push(newScript);
            });

            // 2. Process non-script content (e.g., noscript, iframe, div, style)
            const nonScriptDoc = parser.parseFromString(html, 'text/html');
            nonScriptDoc.querySelectorAll('script').forEach(s => s.remove());
            const nonScriptHtml = nonScriptDoc.body.innerHTML;
            if (nonScriptHtml) {
                const markupContainer = document.createElement('div');
                markupContainer.className = 'custom-code-markup w-full';
                markupContainer.innerHTML = nonScriptHtml;
                container.appendChild(markupContainer);
            }
        } catch (err) {
            console.error('[CodeElement] Error executing embedded code:', err);
        }

        return () => {
            scriptElements.forEach((s) => {
                try {
                    if (s.parentNode) s.parentNode.removeChild(s);
                } catch (e) {}
            });
            if (container) {
                container.innerHTML = '';
            }
        };
    }, [html, isReadOnly]);

    // ─── Editor Live Preview: Safely render visual content (iframes, HTML) ────
    useEffect(() => {
        if (isReadOnly || !html.trim() || !editorPreviewRef.current || !showPreview || !hasVisualContent) return;

        const container = editorPreviewRef.current;
        container.innerHTML = '';

        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Remove all script tags for safety in the editor
            doc.querySelectorAll('script').forEach(s => s.remove());

            const safeHtml = doc.body.innerHTML;
            if (safeHtml.trim()) {
                const wrapper = document.createElement('div');
                wrapper.className = 'w-full';
                wrapper.innerHTML = safeHtml;
                container.appendChild(wrapper);
            }
        } catch (err) {
            console.error('[CodeElement] Editor preview error:', err);
            container.innerHTML = '<p style="color: #ef4444; font-size: 12px; padding: 8px;">Preview failed to render.</p>';
        }

        return () => {
            if (container) container.innerHTML = '';
        };
    }, [html, isReadOnly, showPreview, hasVisualContent]);

    // ─── Editor iframe auto-resize listener ────────────────────────────────
    useEffect(() => {
        if (isReadOnly || !hasIframe) return;

        const handleMessage = (e: MessageEvent) => {
            if (!e.data || e.data.type !== '180workspace:form:resize' || !e.data.height) return;
            if (!editorPreviewRef.current) return;

            // Find and resize matching iframe in the preview container
            const iframes = editorPreviewRef.current.querySelectorAll('iframe');
            iframes.forEach((iframe) => {
                try {
                    if (iframe.contentWindow === e.source) {
                        iframe.style.height = `${e.data.height + 16}px`;
                        iframe.style.overflow = 'visible';
                        iframe.setAttribute('scrolling', 'no');
                    }
                } catch (_) {}
            });
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [isReadOnly, hasIframe]);

    // ─── Public Site Mode ───────────────────────────────────────────────────
    if (isReadOnly) {
        if (!html.trim()) return null;
        return (
            <div 
                ref={containerRef}
                style={element.style} 
                className="w-full relative custom-code-container"
            />
        );
    }

    // ─── Visual Editor Canvas Mode (isReadOnly = false) ─────────────────────
    if (!html.trim()) {
        return (
            <div 
                className="w-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-xl bg-indigo-50/30 text-gray-500 transition-all cursor-pointer group"
                style={element.style}
            >
                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Code2 className="w-6 h-6" />
                </div>
                <span className="text-sm font-bold text-gray-800">Embed Code Element</span>
                <span className="text-xs text-gray-500 mt-1 text-center max-w-sm">
                    Click to add HTML, Meta Pixel conversion events, Google Ads tags, or third-party widgets.
                </span>
                <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-indigo-200 text-indigo-600 text-xs font-bold rounded-lg shadow-xs">
                    + Insert Code in Sidebar
                </span>
            </div>
        );
    }

    // If code has visual content (iframe, UI), render it seamlessly like a native element
    if (hasVisualContent && showPreview) {
        return (
            <div 
                style={element.style} 
                className="w-full relative group"
            >
                {/* Visual Preview */}
                <div
                    ref={editorPreviewRef}
                    className="w-full min-h-[50px]"
                    style={{ pointerEvents: 'auto' }}
                />
                
                {/* Invisible overlay to capture clicks in the editor so it selects the element */}
                <div className="absolute inset-0 z-10 cursor-pointer" title="Click to edit code" />
            </div>
        );
    }

    // For invisible scripts (pixels, analytics) or if preview is disabled, show the code snippet card
    return (
        <div 
            style={element.style} 
            className="w-full relative border border-gray-200 rounded-xl bg-white shadow-xs overflow-hidden"
        >
            {/* Header bar */}
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-gray-800">Custom Code Embed</span>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Active on Live Site
                    </span>
                </div>
                
                {/* Detected Badges + Preview Toggle */}
                <div className="flex items-center gap-1.5">
                    {hasMetaPixel && (
                        <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded">
                            Meta Pixel
                        </span>
                    )}
                    {hasGoogleAnalytics && (
                        <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">
                            Google Tag
                        </span>
                    )}
                    {hasTikTokPixel && (
                        <span className="text-[10px] font-bold bg-neutral-900 text-white px-1.5 py-0.5 rounded">
                            TikTok
                        </span>
                    )}
                    {hasIframe && (
                        <span className="text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded">
                            Iframe
                        </span>
                    )}
                    {hasStyle && (
                        <span className="text-[10px] font-bold bg-pink-50 text-pink-700 border border-pink-200 px-1.5 py-0.5 rounded">
                            CSS
                        </span>
                    )}
                </div>
            </div>

            {/* Code Snippet Box */}
            <div className="p-3 bg-[#1e1e1e] text-gray-300 font-mono text-[11px] leading-relaxed max-h-32 overflow-y-auto select-none">
                <pre className="whitespace-pre-wrap">{html.slice(0, 300)}{html.length > 300 ? '...' : ''}</pre>
            </div>

            {/* Footer / Status */}
            <div className="px-3.5 py-2 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                <span>{html.length} characters • {html.split('\n').length} lines</span>
                <span className="text-gray-400 italic">Executes on public website</span>
            </div>
        </div>
    );
}
