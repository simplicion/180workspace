'use client';

import React from 'react';
import { useDispatch } from 'react-redux';
import { updateBlock, Block } from '@/redux/slices/documentSlice';
import { Image as ImageIcon, Upload, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import clsx from 'clsx';

interface ImagePropertiesProps {
    block: Block;
}

const SHADOW_OPTIONS = [
    { label: 'None', value: 'none' },
    { label: 'Subtle', value: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' },
    { label: 'Medium', value: '0 4px 6px -1px rgba(0, 0, 0, 0.07)' },
    { label: 'Elevated', value: '0 10px 15px -3px rgba(0, 0, 0, 0.08)' }
];

export function ImageProperties({ block }: ImagePropertiesProps) {
    const dispatch = useDispatch();
    const content = block.content || {};
    const styles = block.styles || {};

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

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                handleContentChange('url', base64String);
            };
            reader.readAsDataURL(file);
        }
    };

    const currentWidth = styles.width ? parseInt(String(styles.width)) : 100;
    const currentRadius = styles.borderRadius !== undefined ? Number(styles.borderRadius) : 8;
    const currentShadow = styles.boxShadow || 'none';

    return (
        <div className="p-4 space-y-5 text-xs text-gray-700">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <span className="font-bold text-gray-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                    Image & Media
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold uppercase">
                    Media
                </span>
            </div>

            {/* Image URL & Upload */}
            <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-700 block">Image Source</label>
                <div className="flex items-center gap-1.5">
                    <input
                        type="text"
                        value={content.url || ''}
                        onChange={(e) => handleContentChange('url', e.target.value)}
                        placeholder="Paste image URL..."
                        className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-medium"
                    />
                </div>
                <label className="flex items-center justify-center gap-1.5 w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold cursor-pointer transition-colors border border-indigo-200">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Image File</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
            </div>

            {/* Caption */}
            <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-700">Caption / Description</label>
                <input
                    type="text"
                    value={content.caption || ''}
                    onChange={(e) => handleContentChange('caption', e.target.value)}
                    placeholder="Optional image caption..."
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-medium"
                />
            </div>

            {/* Alignment */}
            <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-700">Alignment</label>
                <div className="grid grid-cols-3 gap-1 p-1 bg-gray-100 rounded-xl">
                    {[
                        { align: 'left', icon: <AlignLeft className="w-3.5 h-3.5" /> },
                        { align: 'center', icon: <AlignCenter className="w-3.5 h-3.5" /> },
                        { align: 'right', icon: <AlignRight className="w-3.5 h-3.5" /> },
                    ].map((item) => (
                        <button
                            key={item.align}
                            type="button"
                            onClick={() => handleStyleChange('alignment', item.align)}
                            className={clsx(
                                "py-1.5 flex items-center justify-center rounded-lg transition-all cursor-pointer",
                                (styles.alignment || 'center') === item.align
                                    ? "bg-white text-indigo-600 shadow-2xs font-bold"
                                    : "text-gray-500 hover:text-gray-800"
                            )}
                        >
                            {item.icon}
                        </button>
                    ))}
                </div>
            </div>

            {/* Width Slider */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-gray-700">Image Max Width (%)</label>
                    <span className="font-mono text-[10px] text-indigo-600 font-semibold">{currentWidth}%</span>
                </div>
                <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={currentWidth}
                    onChange={(e) => handleStyleChange('width', `${e.target.value}%`)}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
            </div>

            {/* Corner Radius */}
            <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700">Corner Radius (px)</label>
                <div className="grid grid-cols-6 gap-1 p-1 bg-gray-100 rounded-xl text-center">
                    {[0, 4, 8, 12, 16, 24].map((r) => (
                        <button
                            key={r}
                            type="button"
                            onClick={() => handleStyleChange('borderRadius', r)}
                            className={clsx(
                                "py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer",
                                currentRadius === r
                                    ? "bg-white text-indigo-600 font-bold shadow-2xs"
                                    : "text-gray-600 hover:text-gray-900"
                            )}
                        >
                            {r}px
                        </button>
                    ))}
                </div>
            </div>

            {/* Elevation / Drop Shadow */}
            <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-700 block">Image Shadow</label>
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
        </div>
    );
}
