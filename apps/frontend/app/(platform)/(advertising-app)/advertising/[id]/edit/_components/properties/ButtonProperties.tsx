import React from 'react';
import CustomSelect from '@/components/ui/CustomSelect';

interface Props {
    selectedElement: any;
    onUpdate: (key: string, value: any) => void;
    brand?: any;
}

export default function ButtonProperties({ selectedElement, onUpdate, brand }: Props) {
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
            
            <div className="grid grid-cols-2 gap-3">
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
                    </CustomSelect>
                </div>
                <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Font Weight</label>
                    <CustomSelect 
                        value={selectedElement.style?.fontWeight || 'bold'} 
                        onChange={(e: any) => onUpdate('style.fontWeight', e.target.value)}
                        className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                        <option value="400">Normal</option>
                        <option value="500">Medium</option>
                        <option value="600">Semi Bold</option>
                        <option value="700">Bold</option>
                        <option value="800">Extra Bold</option>
                        <option value="900">Black</option>
                    </CustomSelect>
                </div>
            </div>

            <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Font Family</label>
                <CustomSelect 
                    value={selectedElement.style?.fontFamily || 'inherit'} 
                    onChange={(e: any) => onUpdate('style.fontFamily', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                    <option value="inherit">Default</option>
                    <option value="Inter, sans-serif">Inter</option>
                    <option value="Roboto, sans-serif">Roboto</option>
                    <option value="Open Sans, sans-serif">Open Sans</option>
                    <option value="Montserrat, sans-serif">Montserrat</option>
                    <option value="Poppins, sans-serif">Poppins</option>
                    <option value="Playfair Display, serif">Playfair Display</option>
                    <option value="Merriweather, serif">Merriweather</option>
                    <option value="monospace">Monospace</option>
                </CustomSelect>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="w-full overflow-hidden">
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Background Color</label>
                    <div className="flex items-center gap-1">
                        <input 
                            type="color" 
                            value={selectedElement.style?.backgroundColor || brand?.primaryColor || '#4f46e5'} 
                            onChange={(e) => onUpdate('style.backgroundColor', e.target.value)}
                            className="w-8 h-8 shrink-0 rounded-lg cursor-pointer border border-gray-200 p-0 shadow-sm"
                        />
                        <input 
                            type="text" 
                            value={selectedElement.style?.backgroundColor || brand?.primaryColor || '#4f46e5'} 
                            onChange={(e) => onUpdate('style.backgroundColor', e.target.value)}
                            className="w-full min-w-0 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none uppercase font-mono"
                        />
                    </div>
                </div>
                <div className="w-full overflow-hidden">
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Text Color</label>
                    <div className="flex items-center gap-1">
                        <input 
                            type="color" 
                            value={selectedElement.style?.color || '#ffffff'} 
                            onChange={(e) => onUpdate('style.color', e.target.value)}
                            className="w-8 h-8 shrink-0 rounded-lg cursor-pointer border border-gray-200 p-0 shadow-sm"
                        />
                        <input 
                            type="text" 
                            value={selectedElement.style?.color || '#ffffff'} 
                            onChange={(e) => onUpdate('style.color', e.target.value)}
                            className="w-full min-w-0 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none uppercase font-mono"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="w-full overflow-hidden">
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Border Color</label>
                    <div className="flex items-center gap-1">
                        <input 
                            type="color" 
                            value={selectedElement.style?.borderColor || '#000000'} 
                            onChange={(e) => {
                                onUpdate('style.borderColor', e.target.value);
                                if (!selectedElement.style?.borderWidth || parseInt(selectedElement.style.borderWidth) === 0) {
                                    onUpdate('style.borderWidth', '1px');
                                }
                                if (!selectedElement.style?.borderStyle) {
                                    onUpdate('style.borderStyle', 'solid');
                                }
                            }}
                            className="w-8 h-8 shrink-0 rounded-lg cursor-pointer border border-gray-200 p-0 shadow-sm"
                        />
                        <input 
                            type="text" 
                            value={selectedElement.style?.borderColor || '#000000'} 
                            onChange={(e) => {
                                onUpdate('style.borderColor', e.target.value);
                                if (!selectedElement.style?.borderWidth || parseInt(selectedElement.style.borderWidth) === 0) {
                                    onUpdate('style.borderWidth', '1px');
                                }
                                if (!selectedElement.style?.borderStyle) {
                                    onUpdate('style.borderStyle', 'solid');
                                }
                            }}
                            className="w-full min-w-0 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none uppercase font-mono"
                        />
                    </div>
                </div>
                <div className="w-full overflow-hidden">
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Border Style</label>
                    <CustomSelect 
                        value={selectedElement.style?.borderStyle || 'solid'} 
                        onChange={(e: any) => {
                            onUpdate('style.borderStyle', e.target.value);
                            if (!selectedElement.style?.borderWidth || parseInt(selectedElement.style.borderWidth) === 0) {
                                onUpdate('style.borderWidth', '1px');
                            }
                        }}
                        className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                        <option value="solid">Solid</option>
                        <option value="dashed">Dashed</option>
                        <option value="dotted">Dotted</option>
                    </CustomSelect>
                </div>
            </div>

            <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 flex justify-between">
                    <span>Border Width</span>
                    <span className="text-indigo-600">{selectedElement.style?.borderWidth || '0px'}</span>
                </label>
                <input 
                    type="range" 
                    min="0" max="10" step="1" 
                    value={selectedElement.style?.borderWidth ? parseInt(selectedElement.style.borderWidth) : 0} 
                    onChange={(e) => {
                        onUpdate('style.borderWidth', `${e.target.value}px`);
                        if (parseInt(e.target.value) > 0 && !selectedElement.style?.borderStyle) {
                            onUpdate('style.borderStyle', 'solid');
                        }
                    }}
                    className="w-full accent-indigo-600"
                />
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
