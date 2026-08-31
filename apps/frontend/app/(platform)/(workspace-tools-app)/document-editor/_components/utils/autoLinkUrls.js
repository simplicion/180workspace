"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoLinkUrls = autoLinkUrls;
/**
 * Utility to automatically detect and transform plain text URLs and existing anchor tags
 * into secure, styled, interactive links with target="_blank" and rel="noopener noreferrer".
 */
function autoLinkUrls(html) {
    if (!html)
        return '';
    // 1. Normalize and style existing <a> tags
    let processed = html.replace(/<a\s+([^>]*?)href=["']([^"']*)["']([^>]*)>(.*?)<\/a>/gi, (match, beforeHref, href, afterHref, text) => {
        const fullHref = href.startsWith('www.') ? `https://${href}` : href;
        return `<a href="${fullHref}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-700 underline font-medium cursor-pointer transition-colors" style="color: #2563eb; text-decoration: underline;">${text}</a>`;
    });
    // 2. Split by HTML tags to safely link plain URLs only inside text nodes (not inside HTML tags or attributes)
    const parts = processed.split(/(<[^>]+>)/g);
    let inAnchor = false;
    const result = parts.map(part => {
        if (part.startsWith('<')) {
            if (/^<a\b/i.test(part))
                inAnchor = true;
            if (/^<\/a>/i.test(part))
                inAnchor = false;
            return part;
        }
        if (inAnchor)
            return part;
        // Auto-detect raw URLs in text nodes (e.g. https://..., http://..., www....)
        const urlRegex = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
        return part.replace(urlRegex, (url) => {
            // Trim trailing punctuation like dots or commas
            let cleanUrl = url;
            let trailingPunct = '';
            if (/[.,;:!?)>]$/.test(cleanUrl)) {
                trailingPunct = cleanUrl.slice(-1);
                cleanUrl = cleanUrl.slice(0, -1);
            }
            const href = cleanUrl.startsWith('www.') ? `https://${cleanUrl}` : cleanUrl;
            return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-700 underline font-medium cursor-pointer transition-colors" style="color: #2563eb; text-decoration: underline;">${cleanUrl}</a>${trailingPunct}`;
        });
    }).join('');
    return result;
}
