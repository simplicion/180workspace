import React from 'react';
import CustomSelect from '@/components/ui/CustomSelect';

interface Props {
    selectedElement: any;
    onUpdate: (key: string, value: any) => void;
}

export default function ContainerProperties({ selectedElement, onUpdate }: Props) {
    if (!['box', 'row', 'column'].includes(selectedElement.type)) return null;

    return (
        <div className="space-y-4 pt-4 border-t border-gray-100">
            <h4 className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-2">Container Layout</h4>

            <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 flex justify-between">
                    <span>Width (%)</span>
                    <span className="text-indigo-600">{selectedElement.style?.width || 'Auto'}</span>
                </label>
                <input 
                    type="range" 
                    min="10" max="100" step="5" 
                    value={selectedElement.style?.width ? parseInt(selectedElement.style.width) : 100} 
                    onChange={(e) => onUpdate('style.width', `${e.target.value}%`)}
                    className="w-full accent-indigo-600"
                />
            </div>

            <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Layout Type</label>
                <CustomSelect 
                    value={selectedElement.style?.display || 'flex'} 
                    onChange={(e: any) => onUpdate('style.display', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                    <option value="flex">Flexbox</option>
                    <option value="grid">CSS Grid</option>
                </CustomSelect>
            </div>
            
            {(!selectedElement.style?.display || selectedElement.style?.display === 'flex') && (
                <>
                    <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Direction</label>
                        <CustomSelect 
                            value={selectedElement.style?.flexDirection || 'column'} 
                            onChange={(e: any) => onUpdate('style.flexDirection', e.target.value)}
                            className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="column">Vertical (Column)</option>
                            <option value="row">Horizontal (Row)</option>
                        </CustomSelect>
                    </div>
                    
                    <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Wrap</label>
                        <CustomSelect 
                            value={selectedElement.style?.flexWrap || 'nowrap'} 
                            onChange={(e: any) => onUpdate('style.flexWrap', e.target.value)}
                            className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="nowrap">No Wrap</option>
                            <option value="wrap">Wrap</option>
                        </CustomSelect>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Align Items (Cross Axis)</label>
                        <CustomSelect 
                            value={selectedElement.style?.alignItems || 'stretch'} 
                            onChange={(e: any) => onUpdate('style.alignItems', e.target.value)}
                            className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="flex-start">Start</option>
                            <option value="center">Center</option>
                            <option value="flex-end">End</option>
                            <option value="stretch">Stretch</option>
                        </CustomSelect>
                    </div>
                    
                    <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Justify Content (Main Axis)</label>
                        <CustomSelect 
                            value={selectedElement.style?.justifyContent || 'flex-start'} 
                            onChange={(e: any) => onUpdate('style.justifyContent', e.target.value)}
                            className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="flex-start">Start</option>
                            <option value="center">Center</option>
                            <option value="flex-end">End</option>
                            <option value="space-between">Space Between</option>
                        </CustomSelect>
                    </div>
                </>
            )}

            {selectedElement.style?.display === 'grid' && (
                <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Grid Columns</label>
                    <CustomSelect 
                        value={selectedElement.style?.gridTemplateColumns || 'repeat(auto-fit, minmax(250px, 1fr))'} 
                        onChange={(e: any) => onUpdate('style.gridTemplateColumns', e.target.value)}
                        className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                        <option value="repeat(auto-fit, minmax(250px, 1fr))">Auto Fit (Responsive)</option>
                        <option value="repeat(1, 1fr)">1 Column</option>
                        <option value="repeat(2, 1fr)">2 Columns</option>
                        <option value="repeat(3, 1fr)">3 Columns</option>
                        <option value="repeat(4, 1fr)">4 Columns</option>
                    </CustomSelect>
                </div>
            )}
            
            <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 flex justify-between">
                    <span>Gap (rem)</span>
                    <span className="text-indigo-600">{selectedElement.style?.gap ? parseFloat(selectedElement.style.gap) : 1}</span>
                </label>
                <input 
                    type="range" 
                    min="0" max="10" step="0.25" 
                    value={selectedElement.style?.gap ? parseFloat(selectedElement.style.gap) : 1} 
                    onChange={(e) => onUpdate('style.gap', `${e.target.value}rem`)}
                    className="w-full accent-indigo-600"
                />
            </div>

            {/* Box Border */}
            <div className="pt-4 border-t border-gray-100 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-2">Border</h4>
                <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 flex justify-between">
                        <span>Border Width</span>
                        <span className="text-indigo-600">{selectedElement.style?.borderWidth || '0px'}</span>
                    </label>
                    <input 
                        type="range" 
                        min="0" max="20" step="1" 
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
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Border Style</label>
                    <CustomSelect 
                        value={selectedElement.style?.borderStyle || 'solid'} 
                        onChange={(e: any) => {
                            onUpdate('style.borderStyle', e.target.value);
                            if (!selectedElement.style?.borderWidth || parseInt(selectedElement.style.borderWidth) === 0) {
                                onUpdate('style.borderWidth', '1px');
                            }
                        }}
                        className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                        <option value="solid">Solid</option>
                        <option value="dashed">Dashed</option>
                        <option value="dotted">Dotted</option>
                    </CustomSelect>
                </div>
                <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Border Color</label>
                    <div className="flex items-center gap-2">
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
                            className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200 p-0 shadow-sm"
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
                            className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none font-mono uppercase"
                        />
                    </div>
                </div>
                <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 flex justify-between">
                        <span>Border Radius</span>
                        <span className="text-indigo-600">{selectedElement.style?.borderRadius || '0px'}</span>
                    </label>
                    <input 
                        type="range" 
                        min="0" max="150" step="1" 
                        value={selectedElement.style?.borderRadius ? parseInt(selectedElement.style.borderRadius) : 0} 
                        onChange={(e) => onUpdate('style.borderRadius', `${e.target.value}px`)}
                        className="w-full accent-indigo-600"
                    />
                </div>
            </div>
        </div>
    );
}
