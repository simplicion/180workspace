'use client';

import React from 'react';
import { useDispatch } from 'react-redux';
import { updateBlock, Block } from '@/redux/slices/documentSlice';
import { 
    Square, 
    Palette, 
    Layers, 
    Sliders, 
    AlignLeft, 
    AlignCenter, 
    AlignRight, 
    Sparkles, 
    Type,
    Maximize2
} from 'lucide-react';
import clsx from 'clsx';

interface BoxPropertiesProps {
    block: Block;
}

const BG_PRESETS = [
    { label: 'White', value: '#ffffff' },
    { label: 'Slate', value: '#f8fafc' },
    { label: 'Gray', value: '#f3f4f6' },
    { label: 'Blue', value: '#eff6ff' },
    { label: 'Green', value: '#f0fdf4' },
    { label: 'Amber', value: '#fffbeb' },
    { label: 'Rose', value: '#fff1f2' },
    { label: 'Transparent', value: 'transparent' }
];

const BORDER_COLORS = [
    { label: 'Default Gray', value: '#e2e8f0' },
    { label: 'Dark Slate', value: '#94a3b8' },
    { label: 'Indigo', value: '#c7d2fe' },
    { label: 'Emerald', value: '#a7f3d0' },
    { label: 'Amber', value: '#fde68a' },
    { label: 'Rose', value: '#fecdd3' }
];

const RADIUS_OPTIONS = [
    { label: '0px', value: 0 },
    { label: '4px', value: 4 },
    { label: '8px', value: 8 },
    { label: '12px', value: 12 },
    { label: '16px', value: 16 },
    { label: '24px', value: 24 }
];

const PADDING_OPTIONS = [
    { label: '8px', value: '8px' },
    { label: '12px', value: '12px' },
    { label: '16px', value: '16px' },
    { label: '20px', value: '20px' },
    { label: '24px', value: '24px' },
    { label: '32px', value: '32px' }
];

const SHADOW_OPTIONS = [
    { label: 'None', value: 'none' },
    { label: 'Subtle', value: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' },
    { label: 'Medium', value: '0 4px 6px -1px rgba(0, 0, 0, 0.07)' },
    { label: 'Elevated', value: '0 10px 15px -3px rgba(0, 0, 0, 0.08)' }
];

export function BoxProperties({ block }: BoxPropertiesProps) {
    const dispatch = useDispatch();
    const styles = block.styles || {};
    const content = block.content || {};

    const handleStyleChange = (key: string, value: any) => {
        dispatch(updateBlock({
            id: block.id,
            updates: {
                styles: {
                    ...styles,
                    [key]: value
                }
            }
        }));
    };

    const handleContentChange = (key: string, value: any) => {
        dispatch(updateBlock({
            id: block.id,
            updates: {
                content: {
                    ...content,
                    [key]: value
                }
            }
        }));
    };

    const currentBg = styles.backgroundColor || '#f8fafc';
    const currentBorderColor = styles.borderColor || '#e2e8f0';
    const currentRadius = styles.borderRadius !== undefined ? Number(styles.borderRadius) : 12;
    const currentBorderWidth = styles.borderWidth !== undefined ? Number(styles.borderWidth) : 1;
    const currentBorderStyle = styles.borderStyle || 'solid';
    const currentPadding = styles.padding || '20px';
    const currentShadow = styles.boxShadow || '0 1px 3px 0 rgba(0, 0, 0, 0.05)';
    const currentTextColor = styles.color || '#1e293b';
    const currentFontSize = styles.fontSize || 14;

    return (
        <div className="p-4 space-y-5 text-xs text-gray-700">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <span className="font-bold text-gray-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Square className="w-3.5 h-3.5 text-indigo-600" />
                    Box & Callout Container
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold uppercase">
                    Card
                </span>
            </div>

            {/* Background Color */}
            <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-700 flex items-center justify-between">
                    <span>Background Fill</span>
                    <span className="text-[10px] text-gray-400 font-mono">{currentBg}</span>
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                    {BG_PRESETS.map((preset) => (
                        <button
                            key={preset.value}
                            type="button"
                            onClick={() => handleStyleChange('backgroundColor', preset.value)}
                            style={{ backgroundColor: preset.value === 'transparent' ? '#ffffff' : preset.value }}
                            className={clsx(
                                "w-6 h-6 rounded-lg border transition-all cursor-pointer shadow-2xs relative",
                                currentBg === preset.value
                                    ? "ring-2 ring-indigo-500 ring-offset-1 border-indigo-400 scale-110"
                                    : "border-gray-200 hover:border-gray-400"
                            )}
                            title={preset.label}
                        >
                            {preset.value === 'transparent' && (
                                <span className="absolute inset-0 flex items-center justify-center text-[8px] text-gray-400 font-bold">∅</span>
                            )}
                        </button>
                    ))}
                    <input
                        type="color"
                        value={currentBg === 'transparent' ? '#ffffff' : currentBg}
                        onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                        className="w-6 h-6 rounded-lg border border-gray-200 cursor-pointer p-0"
                        title="Custom Color"
                    />
                </div>
            </div>

            {/* Border Radius */}
            <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-700 flex items-center justify-between">
                    <span>Corner Radius</span>
                    <span className="text-[10px] font-semibold text-indigo-600">{currentRadius}px</span>
                </label>
                <div className="grid grid-cols-6 gap-1 p-1 bg-gray-100 rounded-xl text-center">
                    {RADIUS_OPTIONS.map((r) => (
                        <button
                            key={r.value}
                            type="button"
                            onClick={() => handleStyleChange('borderRadius', r.value)}
                            className={clsx(
                                "py-1.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer",
                                currentRadius === r.value
                                    ? "bg-white text-indigo-600 font-bold shadow-2xs"
                                    : "text-gray-600 hover:text-gray-900"
                            )}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Border Styling (Width & Style) */}
            <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-700 block">Border Line & Width</label>
                <div className="grid grid-cols-5 gap-1 p-1 bg-gray-100 rounded-xl text-center">
                    {[0, 1, 2, 3, 4].map((w) => (
                        <button
                            key={w}
                            type="button"
                            onClick={() => handleStyleChange('borderWidth', w)}
                            className={clsx(
                                "py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer",
                                currentBorderWidth === w
                                    ? "bg-white text-indigo-600 font-bold shadow-2xs"
                                    : "text-gray-600 hover:text-gray-900"
                            )}
                        >
                            {w === 0 ? 'None' : `${w}px`}
                        </button>
                    ))}
                </div>

                {currentBorderWidth > 0 && (
                    <div className="grid grid-cols-3 gap-1 p-1 bg-gray-100 rounded-xl text-center mt-2">
                        {['solid', 'dashed', 'dotted'].map((st) => (
                            <button
                                key={st}
                                type="button"
                                onClick={() => handleStyleChange('borderStyle', st)}
                                className={clsx(
                                    "py-1 rounded-lg text-[10px] font-semibold uppercase transition-all cursor-pointer",
                                    currentBorderStyle === st
                                        ? "bg-white text-indigo-600 font-bold shadow-2xs"
                                        : "text-gray-600 hover:text-gray-900"
                                )}
                            >
                                {st}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Border Color */}
            {currentBorderWidth > 0 && (
                <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-700 block">Border Color</label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {BORDER_COLORS.map((c) => (
                            <button
                                key={c.value}
                                type="button"
                                onClick={() => handleStyleChange('borderColor', c.value)}
                                style={{ backgroundColor: c.value }}
                                className={clsx(
                                    "w-6 h-6 rounded-lg border transition-all cursor-pointer shadow-2xs",
                                    currentBorderColor === c.value
                                        ? "ring-2 ring-indigo-500 ring-offset-1 border-indigo-400 scale-110"
                                        : "border-gray-200 hover:border-gray-400"
                                )}
                                title={c.label}
                            />
                        ))}
                        <input
                            type="color"
                            value={currentBorderColor}
                            onChange={(e) => handleStyleChange('borderColor', e.target.value)}
                            className="w-6 h-6 rounded-lg border border-gray-200 cursor-pointer p-0"
                            title="Custom Border Color"
                        />
                    </div>
                </div>
            )}

            {/* Inner Padding */}
            <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-700 block">Inner Padding</label>
                <div className="grid grid-cols-6 gap-1 p-1 bg-gray-100 rounded-xl text-center">
                    {PADDING_OPTIONS.map((p) => (
                        <button
                            key={p.value}
                            type="button"
                            onClick={() => handleStyleChange('padding', p.value)}
                            className={clsx(
                                "py-1.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer",
                                currentPadding === p.value
                                    ? "bg-white text-indigo-600 font-bold shadow-2xs"
                                    : "text-gray-600 hover:text-gray-900"
                            )}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Elevation / Drop Shadow */}
            <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-700 block">Box Elevation / Shadow</label>
                <div className="grid grid-cols-4 gap-1 p-1 bg-gray-100 rounded-xl text-center">
                    {SHADOW_OPTIONS.map((sh) => (
                        <button
                            key={sh.value}
                            type="button"
                            onClick={() => handleStyleChange('boxShadow', sh.value)}
                            className={clsx(
                                "py-1.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer",
                                currentShadow === sh.value
                                    ? "bg-white text-indigo-600 font-bold shadow-2xs"
                                    : "text-gray-600 hover:text-gray-900"
                            )}
                        >
                            {sh.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Text Formatting */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
                <label className="text-[11px] font-bold text-gray-700 block">Content Text Color</label>
                <div className="flex items-center gap-2">
                    <input
                        type="color"
                        value={currentTextColor}
                        onChange={(e) => handleStyleChange('color', e.target.value)}
                        className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer p-0"
                    />
                    <span className="text-xs font-mono text-gray-600">{currentTextColor}</span>
                </div>
            </div>
        </div>
    );
}
