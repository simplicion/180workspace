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
                <button
                    onClick={() => setIsEditorOpen(true)}
                    className="w-full py-3 px-4 bg-gray-50 hover:bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                    <Maximize2 className="w-4 h-4" />
                    Open Full-Screen Editor
                </button>
            </div>

            <CodeEditorModal
                isOpen={isEditorOpen}
                onClose={() => setIsEditorOpen(false)}
                initialCode={selectedElement.data?.html || ''}
                onSave={(newCode) => {
                    onUpdate('data.html', newCode);
                }}
            />
        </div>
    );
}
