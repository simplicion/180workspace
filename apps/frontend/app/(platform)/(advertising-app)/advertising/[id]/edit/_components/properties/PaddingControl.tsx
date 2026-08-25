import React, { useState } from 'react';
import { Square, LayoutPanelTop, Move, BoxSelect } from 'lucide-react';

interface Props {
    selectedElement: any;
    onUpdate: (key: string, value: any) => void;
}

export default function PaddingControl({ selectedElement, onUpdate }: Props) {
    const [spacingType, setSpacingType] = useState<'outer' | 'inner'>('outer');
    const [isUniform, setIsUniform] = useState(true);

    const parseVal = (val: any) => {
        if (val === undefined || val === null) return undefined;
        if (typeof val === 'number') return val;
        const parsed = parseFloat(String(val).replace('rem', '').replace('px', '').replace('em', ''));
        return isNaN(parsed) ? undefined : parsed;
    };

    // --- Outer Spacing (Margin) Values ---
    const mt = parseVal(selectedElement.style?.marginTop) ?? parseVal(selectedElement.style?.marginY) ?? parseVal(selectedElement.style?.margin) ?? 0;
    const mb = parseVal(selectedElement.style?.marginBottom) ?? parseVal(selectedElement.style?.marginY) ?? parseVal(selectedElement.style?.margin) ?? 0;
    const ml = parseVal(selectedElement.style?.marginLeft) ?? parseVal(selectedElement.style?.marginX) ?? parseVal(selectedElement.style?.margin) ?? 0;
    const mr = parseVal(selectedElement.style?.marginRight) ?? parseVal(selectedElement.style?.marginX) ?? parseVal(selectedElement.style?.margin) ?? 0;

    // --- Inner Spacing (Padding) Values ---
    const pt = parseVal(selectedElement.style?.paddingTop) ?? parseVal(selectedElement.style?.paddingY) ?? parseVal(selectedElement.style?.padding) ?? 0;
    const pb = parseVal(selectedElement.style?.paddingBottom) ?? parseVal(selectedElement.style?.paddingY) ?? parseVal(selectedElement.style?.padding) ?? 0;
    const pl = parseVal(selectedElement.style?.paddingLeft) ?? parseVal(selectedElement.style?.paddingX) ?? parseVal(selectedElement.style?.padding) ?? 0;
    const pr = parseVal(selectedElement.style?.paddingRight) ?? parseVal(selectedElement.style?.paddingX) ?? parseVal(selectedElement.style?.padding) ?? 0;

    const currentTop = spacingType === 'outer' ? mt : pt;
    const currentBottom = spacingType === 'outer' ? mb : pb;
    const currentLeft = spacingType === 'outer' ? ml : pl;
    const currentRight = spacingType === 'outer' ? mr : pr;

    const handleUniformChange = (val: number) => {
        if (spacingType === 'outer') {
            onUpdate('style.marginTop', `${val}rem`);
            onUpdate('style.marginBottom', `${val}rem`);
            onUpdate('style.marginLeft', `${val}rem`);
            onUpdate('style.marginRight', `${val}rem`);
        } else {
            onUpdate('style.paddingTop', `${val}rem`);
            onUpdate('style.paddingBottom', `${val}rem`);
            onUpdate('style.paddingLeft', `${val}rem`);
            onUpdate('style.paddingRight', `${val}rem`);
        }
    };

    const handleSideChange = (side: 'Top' | 'Bottom' | 'Left' | 'Right', val: number) => {
        const key = spacingType === 'outer' ? `style.margin${side}` : `style.padding${side}`;
        onUpdate(key, `${val}rem`);
    };

    return (
        <div className="space-y-4 pt-4 border-t border-gray-100">
            {/* Header with Type Selector (Outer vs Inner) */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black uppercase tracking-widest text-gray-500">Spacing</span>
                </div>

                {/* Outer (Margin) vs Inner (Padding) Tabs */}
                <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                    <button
                        type="button"
                        onClick={() => setSpacingType('outer')}
                        className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all ${
                            spacingType === 'outer'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                        title="Outer Spacing (Margin outside box)"
                    >
                        <Move className="w-3 h-3" />
                        Outer (Margin)
                    </button>
                    <button
                        type="button"
                        onClick={() => setSpacingType('inner')}
                        className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all ${
                            spacingType === 'inner'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                        title="Inner Spacing (Padding inside box)"
                    >
                        <BoxSelect className="w-3 h-3" />
                        Inner (Padding)
                    </button>
                </div>
            </div>

            {/* Mode Switch (Uniform vs Independent) */}
            <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="font-semibold">
                    {spacingType === 'outer' ? 'Outer Spacing (Around Box)' : 'Inner Spacing (Inside Box)'}
                </span>

                <div className="flex bg-gray-100 p-0.5 rounded-md border border-gray-200">
                    <button
                        type="button"
                        onClick={() => setIsUniform(true)}
                        className={`p-1 rounded transition-all ${
                            isUniform 
                                ? 'bg-white text-indigo-600 shadow-xs' 
                                : 'text-gray-400 hover:text-gray-600'
                        }`}
                        title="Uniform Spacing"
                    >
                        <Square className="w-3 h-3" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsUniform(false)}
                        className={`p-1 rounded transition-all ${
                            !isUniform 
                                ? 'bg-white text-indigo-600 shadow-xs' 
                                : 'text-gray-400 hover:text-gray-600'
                        }`}
                        title="Independent Sides"
                    >
                        <LayoutPanelTop className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* Sliders / Inputs */}
            {isUniform ? (
                <div className="flex items-center gap-3">
                    <input 
                        type="range" 
                        min="0" max="15" step="0.5" 
                        value={currentTop} 
                        onChange={(e) => handleUniformChange(parseFloat(e.target.value))}
                        className="flex-1 accent-indigo-600"
                    />
                    <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 w-16">
                        <input 
                            type="number"
                            min="0" max="15" step="0.5"
                            value={currentTop}
                            onChange={(e) => handleUniformChange(parseFloat(e.target.value) || 0)}
                            className="w-full bg-transparent outline-none text-xs font-bold text-gray-700 text-center"
                        />
                        <span className="text-[10px] text-gray-400 font-mono">rem</span>
                    </div>
                </div>
            ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 relative">
                    {/* Top */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
                        <span className="text-[10px] font-bold text-gray-400 mb-0.5">Top</span>
                        <input 
                            type="number" min="0" max="15" step="0.5"
                            value={currentTop} 
                            onChange={(e) => handleSideChange('Top', parseFloat(e.target.value) || 0)}
                            className="w-12 bg-white border border-gray-200 rounded text-xs text-center py-0.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-semibold"
                        />
                    </div>
                    
                    {/* Bottom */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
                        <input 
                            type="number" min="0" max="15" step="0.5"
                            value={currentBottom} 
                            onChange={(e) => handleSideChange('Bottom', parseFloat(e.target.value) || 0)}
                            className="w-12 bg-white border border-gray-200 rounded text-xs text-center py-0.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-semibold"
                        />
                        <span className="text-[10px] font-bold text-gray-400 mt-0.5">Bottom</span>
                    </div>
                    
                    {/* Left */}
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <span className="text-[10px] font-bold text-gray-400">Left</span>
                        <input 
                            type="number" min="0" max="15" step="0.5"
                            value={currentLeft} 
                            onChange={(e) => handleSideChange('Left', parseFloat(e.target.value) || 0)}
                            className="w-12 bg-white border border-gray-200 rounded text-xs text-center py-0.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-semibold"
                        />
                    </div>
                    
                    {/* Right */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <input 
                            type="number" min="0" max="15" step="0.5"
                            value={currentRight} 
                            onChange={(e) => handleSideChange('Right', parseFloat(e.target.value) || 0)}
                            className="w-12 bg-white border border-gray-200 rounded text-xs text-center py-0.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-semibold"
                        />
                        <span className="text-[10px] font-bold text-gray-400">Right</span>
                    </div>

                    {/* Center decorative box */}
                    <div className="w-16 h-12 border-2 border-dashed border-indigo-200 bg-white rounded-lg mx-auto my-7 flex items-center justify-center">
                        <span className="text-[9px] font-black uppercase text-indigo-400">
                            {spacingType === 'outer' ? 'Box' : 'Content'}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
