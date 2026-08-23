import React from 'react';
import { ElementNode } from '../types';

interface CodeElementProps {
    element: ElementNode;
}

export default function CodeElement({ element }: CodeElementProps) {
    const html = element.data?.html || '';
    
    // In the editor, we might want to just show a placeholder if the HTML is empty
    if (!html.trim()) {
        return (
            <div 
                className="w-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 text-gray-400"
                style={element.style}
            >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2">
                    <polyline points="16 18 22 12 16 6"></polyline>
                    <polyline points="8 6 2 12 8 18"></polyline>
                </svg>
                <span className="text-sm font-medium">Embed Code Element</span>
                <span className="text-xs mt-1">Select this element and add your HTML/JS code in the properties panel.</span>
            </div>
        );
    }

    return (
        <div 
            style={element.style} 
            className="w-full relative"
            // We use dangerouslySetInnerHTML to render the raw HTML inside this wrapper
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}
