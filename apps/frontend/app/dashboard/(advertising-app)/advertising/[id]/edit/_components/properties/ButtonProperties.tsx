import React from 'react';

interface Props {
    selectedElement: any;
    onUpdate: (key: string, value: any) => void;
}

export default function ButtonProperties({ selectedElement, onUpdate }: Props) {
    if (selectedElement.type !== 'button') return null;

    return (
        <div className="space-y-4 pt-4 border-t border-gray-100">
            <h4 className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-2">Button Settings</h4>
            <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Button Text</label>
                <input 
                    type="text" 
                    value={selectedElement.data?.content || ''} 
                    onChange={(e) => onUpdate('data.content', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Click Me"
                />
            </div>
            <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Link URL</label>
                <input 
                    type="text" 
                    value={selectedElement.data?.link || ''} 
                    onChange={(e) => onUpdate('data.link', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="https://..."
                />
            </div>
            <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Text Color</label>
                <div className="flex items-center gap-2">
                    <input 
                        type="color" 
                        value={selectedElement.style?.color || '#ffffff'} 
                        onChange={(e) => onUpdate('style.color', e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200 p-0 shadow-sm"
                    />
                    <input 
                        type="text" 
                        value={selectedElement.style?.color || '#ffffff'} 
                        onChange={(e) => onUpdate('style.color', e.target.value)}
                        className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none uppercase font-mono"
                    />
                </div>
            </div>
            <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 flex justify-between">
                    <span>Corner Radius</span>
                    <span className="text-indigo-600">{selectedElement.style?.borderRadius || '0.5rem'}</span>
                </label>
                <input 
                    type="range" 
                    min="0" max="150" step="1" 
                    value={selectedElement.style?.borderRadius ? parseInt(selectedElement.style.borderRadius) : 8} 
                    onChange={(e) => onUpdate('style.borderRadius', `${e.target.value}px`)}
                    className="w-full accent-indigo-600"
                />
            </div>
        </div>
    );
}
