import React from 'react';
import CustomSelect from '@/components/ui/CustomSelect';

interface Props {
    selectedElement: any;
    onUpdate: (key: string, value: any) => void;
}

export default function TextProperties({ selectedElement, onUpdate }: Props) {
    if (selectedElement.type !== 'text') return null;

    return (
        <div className="space-y-4 pt-4 border-t border-gray-100">
            <h4 className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-2">Text Settings</h4>
            
            <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Tag</label>
                <CustomSelect 
                    value={selectedElement.style?.tagName || 'div'} 
                    onChange={(e: any) => onUpdate('style.tagName', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                    <option value="h1">Heading 1 (h1)</option>
                    <option value="h2">Heading 2 (h2)</option>
                    <option value="h3">Heading 3 (h3)</option>
                    <option value="h4">Heading 4 (h4)</option>
                    <option value="p">Paragraph (p)</option>
                    <option value="div">Div Block</option>
                    <option value="span">Inline Span</option>
                </CustomSelect>
            </div>

            <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Font Size</label>
                <CustomSelect 
                    value={selectedElement.style?.fontSize || '1rem'} 
                    onChange={(e: any) => onUpdate('style.fontSize', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                    <option value="0.75rem">XS (0.75rem)</option>
                    <option value="0.875rem">SM (0.875rem)</option>
                    <option value="1rem">Base (1rem)</option>
                    <option value="1.125rem">LG (1.125rem)</option>
                    <option value="1.25rem">XL (1.25rem)</option>
                    <option value="1.5rem">2XL (1.5rem)</option>
                    <option value="2.25rem">4XL (2.25rem)</option>
                    <option value="3rem">5XL (3rem)</option>
                    <option value="4.5rem">7XL (4.5rem)</option>
                </CustomSelect>
            </div>

            <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Font Weight</label>
                <CustomSelect 
                    value={selectedElement.style?.fontWeight || '400'} 
                    onChange={(e: any) => onUpdate('style.fontWeight', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                    <option value="300">Light</option>
                    <option value="400">Normal</option>
                    <option value="500">Medium</option>
                    <option value="600">Semi Bold</option>
                    <option value="700">Bold</option>
                    <option value="800">Extra Bold</option>
                    <option value="900">Black</option>
                </CustomSelect>
            </div>

            <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Text Align</label>
                <CustomSelect 
                    value={selectedElement.style?.textAlign || 'left'} 
                    onChange={(e: any) => onUpdate('style.textAlign', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                    <option value="justify">Justify</option>
                </CustomSelect>
            </div>
            
            <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Text Color</label>
                <div className="flex items-center gap-2">
                    <input 
                        type="color" 
                        value={selectedElement.style?.color || '#000000'} 
                        onChange={(e) => onUpdate('style.color', e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200 p-0 shadow-sm"
                    />
                    <input 
                        type="text" 
                        value={selectedElement.style?.color || '#000000'} 
                        onChange={(e) => onUpdate('style.color', e.target.value)}
                        className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none font-mono uppercase"
                    />
                </div>
            </div>
        </div>
    );
}
