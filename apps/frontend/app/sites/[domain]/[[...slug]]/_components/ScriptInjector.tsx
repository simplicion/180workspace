'use client';

import React, { useEffect, useRef } from 'react';

interface ScriptInjectorProps {
    html?: string;
    position?: 'head' | 'body' | 'inline';
    className?: string;
}

/**
 * ScriptInjector
 * 
 * Safely parses and dynamically executes HTML containing <script> tags,
 * <noscript> tracking pixels, <style> tags, and standard DOM elements.
 * 
 * Extracts all <script> tags, creates real DOM script elements with matching
 * attributes, and evaluates them in global window scope. Also handles multi-pixel
 * Meta / Google / TikTok tracking initializations so subsequent pixels are never
 * suppressed by boilerplate early-returns.
 */
export function ScriptInjector({ html, position = 'inline', className = '' }: ScriptInjectorProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!html || !html.trim() || !containerRef.current) return;

        const container = containerRef.current;
        const scriptElements: HTMLScriptElement[] = [];

        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // 1. Process and execute all <script> tags
            const scripts = doc.querySelectorAll('script');
            scripts.forEach((oldScript) => {
                const newScript = document.createElement('script');
                
                // Copy all attributes
                Array.from(oldScript.attributes).forEach((attr) => {
                    newScript.setAttribute(attr.name, attr.value);
                });

                // Copy script text
                const scriptText = oldScript.innerHTML || '';
                if (scriptText) {
                    newScript.textContent = scriptText;
                }

                // Append script
                if (position === 'head') {
                    document.head.appendChild(newScript);
                } else {
                    container.appendChild(newScript);
                }
                scriptElements.push(newScript);

                // Multi-Pixel Protection: If fbq is already initialized on window, ensure this pixel ID is registered
                if (scriptText.includes('fbq')) {
                    const fbqInitMatches = Array.from(scriptText.matchAll(/fbq\s*\(\s*['"]init['"]\s*,\s*['"]([0-9A-Za-z_-]+)['"]\s*\)/g));
                    if (fbqInitMatches.length > 0 && typeof window !== 'undefined' && (window as any).fbq) {
                        fbqInitMatches.forEach((m) => {
                            const pixelId = m[1];
                            if (pixelId) {
                                try {
                                    (window as any).fbq('init', pixelId);
                                    (window as any).fbq('track', 'PageView');
                                } catch (_) {}
                            }
                        });
                    }
                }
            });

            // 2. Process non-script content (e.g. noscript, iframes, styles, divs)
            const nonScriptDoc = parser.parseFromString(html, 'text/html');
            nonScriptDoc.querySelectorAll('script').forEach(s => s.remove());
            
            const nonScriptHtml = nonScriptDoc.body.innerHTML;
            if (nonScriptHtml) {
                const markupContainer = document.createElement('div');
                markupContainer.className = 'custom-embed-markup w-full';
                markupContainer.innerHTML = nonScriptHtml;
                container.appendChild(markupContainer);
            }
        } catch (err) {
            console.error('[ScriptInjector] Error executing embed code:', err);
        }

        return () => {
            scriptElements.forEach((s) => {
                try {
                    if (s.parentNode) {
                        s.parentNode.removeChild(s);
                    }
                } catch (_) {}
            });
            if (container) {
                container.innerHTML = '';
            }
        };
    }, [html, position]);

    if (!html || !html.trim()) return null;

    return <div ref={containerRef} className={`script-injector-container ${className}`} />;
}

export default ScriptInjector;
