'use client';

import React, { useState } from 'react';
import { ElementNode } from '../../types';
import { Code2, Maximize2 } from 'lucide-react';
import CodeEditorModal from '../../CodeEditorModal';

interface CodePropertiesProps {
    selectedElement: ElementNode;
    onUpdate: (key: string, value: any) => void;
}



export default function CodeProperties({ selectedElement, onUpdate }: CodePropertiesProps) {
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    if (selectedElement.type !== 'code') return null;

    const currentCode = selectedElement.data?.html || '';



    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <Code2 className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-sm text-gray-800">Embed Code Element</h3>
                </div>
            </div>

            {/* Quick Code Textarea */}
            <div>
                <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-gray-700">HTML / JavaScript Code</label>
                    <span className="text-[10px] text-gray-400 font-mono">{currentCode.length} chars</span>
                </div>
                <textarea
                    value={currentCode}
                    onChange={(e) => onUpdate('data.html', e.target.value)}
                    rows={6}
                    spellCheck={false}
                    placeholder="<div>Paste your HTML, Meta Pixel, or script snippet here...</div>"
                    className="w-full p-2.5 font-mono text-xs border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:bg-white bg-gray-50 text-gray-800 transition-all resize-y"
                />
            </div>

            {/* Full-Screen Editor Button */}
            <div className="space-y-2">
                <button
                    onClick={() => setIsEditorOpen(true)}
                    className="w-full py-2.5 px-4 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                    <Maximize2 className="w-3.5 h-3.5" />
                    Open Full-Screen Code Editor
                </button>
            </div>

            <CodeEditorModal
                isOpen={isEditorOpen}
                onClose={() => setIsEditorOpen(false)}
                initialCode={currentCode}
                onSave={(newCode) => {
                    onUpdate('data.html', newCode);
                }}
            />
        </div>
    );
}
