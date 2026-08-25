import React from 'react';
import CustomSelect from '@/components/ui/CustomSelect';

interface Props {
    selectedElement: any;
    onUpdate: (key: string, value: any) => void;
}

export default function DividerProperties({ selectedElement, onUpdate }: Props) {
    if (selectedElement.type !== 'line' && selectedElement.type !== 'divider') return null;

    return (
        <div className="space-y-4 pt-4 border-t border-gray-100">
            <h4 className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-2">Divider Settings</h4>
            
            <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Color</label>
                <div className="flex items-center gap-2">
                    <input 
                        type="color" 
                        value={selectedElement.style?.backgroundColor || '#e5e7eb'} 
                        onChange={(e) => onUpdate('style.backgroundColor', e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200 p-0 shadow-sm"
                    />
                    <input 
                        type="text" 
                        value={selectedElement.style?.backgroundColor || '#e5e7eb'} 
                        onChange={(e) => onUpdate('style.backgroundColor', e.target.value)}
                        className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none uppercase font-mono"
                    />
                </div>
            </div>

            <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Direction</label>
                <CustomSelect 
                    value={selectedElement.style?.direction || 'horizontal'} 
                    onChange={(e: any) => {
                        onUpdate('style.direction', e.target.value);
                    }}
                    className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                    <option value="horizontal">Horizontal</option>
                    <option value="vertical">Vertical</option>
                </CustomSelect>
            </div>
            
            <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Line Style</label>
                <CustomSelect 
                    value={selectedElement.style?.borderStyle || 'solid'} 
                    onChange={(e: any) => {
                        onUpdate('style.borderStyle', e.target.value);
                    }}
                    className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                    <option value="solid">Solid</option>
                    <option value="dashed">Dashed</option>
                    <option value="dotted">Dotted</option>
                </CustomSelect>
            </div>

            <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 flex justify-between">
                    <span>Thickness</span>
                    <span className="text-indigo-600">{selectedElement.style?.thickness || '2px'}</span>
                </label>
                <input 
                    type="range" 
                    min="1" max="20" step="1" 
                    value={selectedElement.style?.thickness ? parseInt(selectedElement.style.thickness) : 2} 
                    onChange={(e) => onUpdate('style.thickness', `${e.target.value}px`)}
                    className="w-full accent-indigo-600"
                />
            </div>
        </div>
    );
}
