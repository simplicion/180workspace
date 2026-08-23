import React, { useState } from 'react';
import { Square, LayoutPanelTop } from 'lucide-react';

interface Props {
    selectedElement: any;
    onUpdate: (key: string, value: any) => void;
}

export default function PaddingControl({ selectedElement, onUpdate }: Props) {
    const [isUniform, setIsUniform] = useState(true);

    const parsePad = (val: any) => {
        if (val === undefined || val === null) return undefined;
        if (typeof val === 'number') return val;
        const parsed = parseFloat(String(val).replace('rem', '').replace('px', '').replace('em', ''));
        return isNaN(parsed) ? undefined : parsed;
    };

    const pt = parsePad(selectedElement.style?.paddingTop) ?? parsePad(selectedElement.style?.paddingY) ?? parsePad(selectedElement.style?.padding) ?? 0;
    const pb = parsePad(selectedElement.style?.paddingBottom) ?? parsePad(selectedElement.style?.paddingY) ?? parsePad(selectedElement.style?.padding) ?? 0;
    const pl = parsePad(selectedElement.style?.paddingLeft) ?? parsePad(selectedElement.style?.paddingX) ?? parsePad(selectedElement.style?.padding) ?? 0;
    const pr = parsePad(selectedElement.style?.paddingRight) ?? parsePad(selectedElement.style?.paddingX) ?? parsePad(selectedElement.style?.padding) ?? 0;

    const uniformValue = pt;

    const handleUniformChange = (val: number) => {
        onUpdate('style.paddingTop', `${val}rem`);
        onUpdate('style.paddingBottom', `${val}rem`);
        onUpdate('style.paddingLeft', `${val}rem`);
        onUpdate('style.paddingRight', `${val}rem`);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Padding</h4>
                
                {/* Toggle Controls */}
                <div className="flex bg-gray-100 p-0.5 rounded-lg">
                    <button
                        onClick={() => setIsUniform(true)}
                        className={`p-1.5 rounded-md transition-all ${
                            isUniform 
                                ? 'bg-indigo-500 text-white shadow-sm' 
                                : 'text-gray-400 hover:text-gray-600'
                        }`}
                        title="Uniform Padding"
                    >
                        <Square className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => setIsUniform(false)}
                        className={`p-1.5 rounded-md transition-all ${
                            !isUniform 
                                ? 'bg-indigo-500 text-white shadow-sm' 
                                : 'text-gray-400 hover:text-gray-600'
                        }`}
                        title="Independent Padding"
                    >
                        <LayoutPanelTop className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {isUniform ? (
                <div className="flex items-center gap-4">
                    <input 
                        type="range" 
                        min="0" max="15" step="0.5" 
                        value={uniformValue} 
                        onChange={(e) => handleUniformChange(parseFloat(e.target.value))}
                        className="flex-1 accent-indigo-500"
                    />
                    <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 w-16">
                        <input 
                            type="number"
                            min="0" max="15" step="0.5"
                            value={uniformValue}
                            onChange={(e) => handleUniformChange(parseFloat(e.target.value))}
                            className="w-full bg-transparent outline-none text-sm font-semibold text-gray-700 text-center"
                        />
                    </div>
                </div>
            ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 relative">
                    {/* Top */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
                        <span className="text-[10px] font-bold text-gray-400 mb-1">T</span>
                        <input 
                            type="number" min="0" max="15" step="0.5"
                            value={pt} onChange={(e) => onUpdate('style.paddingTop', `${parseFloat(e.target.value)}rem`)}
                            className="w-10 bg-white border border-gray-200 rounded text-xs text-center py-0.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                    
                    {/* Bottom */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
                        <input 
                            type="number" min="0" max="15" step="0.5"
                            value={pb} onChange={(e) => onUpdate('style.paddingBottom', `${parseFloat(e.target.value)}rem`)}
                            className="w-10 bg-white border border-gray-200 rounded text-xs text-center py-0.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                        <span className="text-[10px] font-bold text-gray-400 mt-1">B</span>
                    </div>
                    
                    {/* Left */}
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <span className="text-[10px] font-bold text-gray-400">L</span>
                        <input 
                            type="number" min="0" max="15" step="0.5"
                            value={pl} onChange={(e) => onUpdate('style.paddingLeft', `${parseFloat(e.target.value)}rem`)}
                            className="w-10 bg-white border border-gray-200 rounded text-xs text-center py-0.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                    
                    {/* Right */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <input 
                            type="number" min="0" max="15" step="0.5"
                            value={pr} onChange={(e) => onUpdate('style.paddingRight', `${parseFloat(e.target.value)}rem`)}
                            className="w-10 bg-white border border-gray-200 rounded text-xs text-center py-0.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                        <span className="text-[10px] font-bold text-gray-400">R</span>
                    </div>

                    {/* Center decorative box */}
                    <div className="w-16 h-12 border-2 border-dashed border-gray-300 rounded-lg mx-auto my-6"></div>
                </div>
            )}
        </div>
    );
}
