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
 * In standard React/Next.js, `dangerouslySetInnerHTML` purposefully ignores
 * `<script>` tags per HTML5 specification. This component extracts all <script>
 * tags, creates real DOM script elements with matching attributes, and evaluates
 * them in the global `window` scope so Meta Pixel (fbq), Google Analytics (gtag),
 * and 3rd-party widgets execute seamlessly.
 */
export function ScriptInjector({ html, position = 'inline', className = '' }: ScriptInjectorProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!html || !html.trim() || !containerRef.current) return;

        const container = containerRef.current;
        const scriptElements: HTMLScriptElement[] = [];

        try {
            // Create a temporary DOM parser to inspect the markup
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // 1. Process and execute all <script> tags
            const scripts = doc.querySelectorAll('script');
            scripts.forEach((oldScript) => {
                const newScript = document.createElement('script');
                
                // Copy all attributes (src, async, defer, type, id, crossorigin, etc.)
                Array.from(oldScript.attributes).forEach((attr) => {
                    newScript.setAttribute(attr.name, attr.value);
                });

                // Copy inline script content
                if (oldScript.innerHTML) {
                    newScript.textContent = oldScript.innerHTML;
                }

                // If position is head, append to document.head; otherwise append to container
                if (position === 'head') {
                    document.head.appendChild(newScript);
                } else {
                    container.appendChild(newScript);
                }

                scriptElements.push(newScript);
            });

            // 2. Process non-script content (e.g. noscript, iframes, styles, divs)
            const nonScriptDoc = parser.parseFromString(html, 'text/html');
            nonScriptDoc.querySelectorAll('script').forEach(s => s.remove());
            
            // Extract body children from parsed non-script doc
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

        // Cleanup injected scripts when element unmounts or html changes
        return () => {
            scriptElements.forEach((s) => {
                try {
                    if (s.parentNode) {
                        s.parentNode.removeChild(s);
                    }
                } catch (e) {
                    // Ignore removal error if already detached
                }
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
