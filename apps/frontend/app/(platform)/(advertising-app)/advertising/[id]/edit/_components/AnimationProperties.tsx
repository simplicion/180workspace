import React, { useState } from 'react';
import { Settings, RefreshCcw, MousePointer2, ArrowRight } from 'lucide-react';
import { ElementNode } from '../types';

interface AnimationPropertiesProps {
    element: ElementNode;
    onUpdate: (key: string, value: any) => void;
}

const ENTRANCE_PRESETS = [
    { value: 'none', label: 'None' },
    { value: 'fade-in', label: 'Fade In' },
    { value: 'fade-up', label: 'Fade Up' },
    { value: 'fade-down', label: 'Fade Down' },
    { value: 'fade-left', label: 'Fade Left' },
    { value: 'fade-right', label: 'Fade Right' },
    { value: 'scale-up', label: 'Zoom In' },
    { value: 'scale-down', label: 'Zoom Out' },
    { value: 'flip-in-x', label: 'Flip X' },
    { value: 'flip-in-y', label: 'Flip Y' },
    { value: 'bounce-in', label: 'Bounce In' }
];

const HOVER_PRESETS = [
    { value: 'none', label: 'None' },
    { value: 'scale-up', label: 'Scale Up' },
    { value: 'scale-down', label: 'Scale Down' },
    { value: 'lift', label: 'Lift Up' },
    { value: 'glow', label: 'Glow' }
];

const LOOP_PRESETS = [
    { value: 'none', label: 'None' },
    { value: 'pulse', label: 'Pulse' },
    { value: 'shake', label: 'Shake' },
    { value: 'spin', label: 'Spin' },
    { value: 'bounce', label: 'Bounce' },
    { value: 'float', label: 'Float' }
];

const EASING_OPTIONS = [
    { value: 'easeOut', label: 'Ease Out (Smooth)' },
    { value: 'easeIn', label: 'Ease In (Accelerate)' },
    { value: 'easeInOut', label: 'Ease In Out' },
    { value: 'linear', label: 'Linear (Constant)' },
    { value: 'backOut', label: 'Back Out (Overshoot)' },
    { value: 'circOut', label: 'Circular Out' }
];

export default function AnimationProperties({ element, onUpdate }: AnimationPropertiesProps) {
    const [activeTab, setActiveTab] = useState<'entrance' | 'hover' | 'loop'>('entrance');
    
    // Initialize config from existing animationConfig or legacy animation string
    const config = element.animationConfig || {
        entrance: { preset: element.animation || 'none', duration: 0.6, delay: 0, easing: 'easeOut' },
        hover: { preset: 'none', duration: 0.3, delay: 0, easing: 'easeOut' },
        loop: { preset: 'none', duration: 2, delay: 0, easing: 'easeInOut' }
    };

    const handleUpdate = (type: 'entrance' | 'hover' | 'loop', field: string, value: any) => {
        const updatedConfig = {
            ...config,
            [type]: {
                ...(config[type] || {}),
                [field]: value
            }
        };
        onUpdate('animationConfig', updatedConfig);
        // Also update legacy for backward compatibility if it's entrance
        if (type === 'entrance' && field === 'preset') {
            onUpdate('animation', value);
        }
    };

    const renderControls = (type: 'entrance' | 'hover' | 'loop', presets: {value: string, label: string}[]) => {
        const currentConfig = config[type] || { preset: 'none', duration: 1, delay: 0, easing: 'easeOut' };
        
        return (
            <div className="space-y-4 mt-4">
                <div>
                    <label className="text-xs font-semibold text-gray-700 mb-2 block">Animation Style</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {presets.map(preset => (
                            <button
                                key={preset.value}
                                onClick={() => handleUpdate(type, 'preset', preset.value)}
                                className={`px-2 py-1.5 text-xs rounded-lg border text-center transition-all ${
                                    currentConfig.preset === preset.value 
                                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-semibold shadow-sm' 
                                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </div>

                {currentConfig.preset !== 'none' && (
                    <div className="space-y-4 p-3 bg-gray-50/50 rounded-xl border border-gray-100">
                        <h4 className="text-xs font-semibold flex items-center gap-1.5 text-gray-700">
                            <Settings className="w-3.5 h-3.5 text-gray-400" /> Advanced Settings
                        </h4>
                        
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs text-gray-600">Duration (s)</label>
                                <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200">{currentConfig.duration}s</span>
                            </div>
                            <input 
                                type="range" 
                                min="0.1" max="5" step="0.1" 
                                value={currentConfig.duration}
                                onChange={(e) => handleUpdate(type, 'duration', parseFloat(e.target.value))}
                                className="w-full accent-indigo-600 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        {type !== 'hover' && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs text-gray-600">Delay (s)</label>
                                    <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200">{currentConfig.delay}s</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0" max="5" step="0.1" 
                                    value={currentConfig.delay || 0}
                                    onChange={(e) => handleUpdate(type, 'delay', parseFloat(e.target.value))}
                                    className="w-full accent-indigo-600 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs text-gray-600 block">Easing Curve</label>
                            <select
                                value={currentConfig.easing || 'easeOut'}
                                onChange={(e) => handleUpdate(type, 'easing', e.target.value)}
                                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                {EASING_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="pt-2">
            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg mb-4 w-full">
                <button
                    onClick={() => setActiveTab('entrance')}
                    className={`flex-1 flex justify-center items-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'entrance' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
                >
                    <ArrowRight className="w-3.5 h-3.5" /> Entrance
                </button>
                <button
                    onClick={() => setActiveTab('hover')}
                    className={`flex-1 flex justify-center items-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'hover' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
                >
                    <MousePointer2 className="w-3.5 h-3.5" /> Hover
                </button>
                <button
                    onClick={() => setActiveTab('loop')}
                    className={`flex-1 flex justify-center items-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'loop' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
                >
                    <RefreshCcw className="w-3.5 h-3.5" /> Loop
                </button>
            </div>

            {activeTab === 'entrance' && renderControls('entrance', ENTRANCE_PRESETS)}
            {activeTab === 'hover' && renderControls('hover', HOVER_PRESETS)}
            {activeTab === 'loop' && renderControls('loop', LOOP_PRESETS)}
        </div>
    );
}
