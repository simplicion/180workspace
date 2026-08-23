import React from 'react';
import { ElementNode } from '../../types';
import { Code2 } from 'lucide-react';

interface CodePropertiesProps {
    selectedElement: ElementNode;
    onUpdate: (key: string, value: any) => void;
}

export default function CodeProperties({ selectedElement, onUpdate }: CodePropertiesProps) {
    if (selectedElement.type !== 'code') return null;
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                <Code2 className="w-5 h-5 text-gray-500" />
                <h3 className="font-bold text-sm text-gray-800">Embed Code</h3>
            </div>
            
            <p className="text-xs text-gray-500 leading-relaxed">
                Paste your custom HTML, CSS, or JavaScript code here. This is useful for embedding third-party widgets, custom forms, iframes, or tracking scripts.
            </p>

            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Raw Code</label>
                <textarea
                    value={selectedElement.data?.html || ''}
                    onChange={(e) => onUpdate('data.html', e.target.value)}
                    placeholder="<div>Hello World</div>"
                    className="w-full h-64 p-3 font-mono text-xs border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-gray-50 resize-y"
                    spellCheck="false"
                />
            </div>
        </div>
    );
}
