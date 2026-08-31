'use client';

import React from 'react';
import { useDispatch } from 'react-redux';
import { updateBlock, Block } from '@/redux/slices/documentSlice';
import { Minus, Scissors, FileText, Palette } from 'lucide-react';
import clsx from 'clsx';

interface DividerPropertiesProps {
    block: Block;
}

export function DividerProperties({ block }: DividerPropertiesProps) {
    const dispatch = useDispatch();
    const content = block.content || {};
    const styles = block.styles || {};

    const isPageBreak = content.isPageBreak === true || block.type === 'pagebreak';

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

    return (
        <div className="p-4 space-y-5 text-xs text-gray-700">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <span className="font-bold text-gray-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Minus className="w-3.5 h-3.5 text-indigo-600" />
                    Divider
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-semibold uppercase">
                    Separator
                </span>
            </div>

            {/* Line Style */}
            <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-700">Line Style</label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 rounded-xl text-center font-medium">
                    {[
                        { style: 'solid', label: 'Solid ──' },
                        { style: 'dashed', label: 'Dashed ╍╍' },
                        { style: 'dotted', label: 'Dotted ⋯⋯' },
                    ].map((item) => (
                        <button
                            key={item.style}
                            type="button"
                            onClick={() => handleStyleChange('borderStyle', item.style)}
                            className={clsx(
                                "py-1.5 rounded-lg text-xs transition-all",
                                (styles.borderStyle || 'solid') === item.style
                                    ? "bg-white text-indigo-600 font-bold shadow-2xs"
                                    : "text-gray-600 hover:text-gray-900"
                            )}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Line Thickness & Color */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700">Thickness (px)</label>
                    <input
                        type="number"
                        min="1"
                        max="12"
                        value={styles.borderWidth ?? 2}
                        onChange={(e) => handleStyleChange('borderWidth', Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-medium"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700">Line Color</label>
                    <div className="flex items-center gap-1.5">
                        <input
                            type="color"
                            value={styles.borderColor || '#cbd5e1'}
                            onChange={(e) => handleStyleChange('borderColor', e.target.value)}
                            className="w-7 h-7 rounded-lg border border-gray-200 cursor-pointer p-0"
                            title="Pick Line Color"
                        />
                        <input
                            type="text"
                            value={styles.borderColor || '#cbd5e1'}
                            onChange={(e) => handleStyleChange('borderColor', e.target.value)}
                            className="w-full px-2 py-1 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-medium font-mono"
                        />
                    </div>
                </div>
            </div>

            {/* Margin Spacing */}
            <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700">Vertical Spacing / Margin (px)</label>
                <input
                    type="number"
                    min="4"
                    max="64"
                    step="4"
                    value={styles.margin ?? 16}
                    onChange={(e) => handleStyleChange('margin', Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-medium"
                />
            </div>
        </div>
    );
}
