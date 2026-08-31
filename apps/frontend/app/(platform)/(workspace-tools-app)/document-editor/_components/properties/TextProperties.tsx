'use client';

import React from 'react';
import { useDispatch } from 'react-redux';
import { updateBlock, Block } from '@/redux/slices/documentSlice';
import { 
    AlignLeft, 
    AlignCenter, 
    AlignRight, 
    AlignJustify,
    Bold, 
    Italic, 
    Underline, 
    Heading1, 
    Heading2, 
    Heading3, 
    Type, 
    Quote,
    Palette,
    Sparkles
} from 'lucide-react';
import clsx from 'clsx';
import { GoogleFontPicker } from '../GoogleFontPicker';

interface TextPropertiesProps {
    block: Block;
}

const COLOR_PALETTE = [
    { label: 'Default', value: '#111827' },
    { label: 'Slate', value: '#475569' },
    { label: 'Indigo', value: '#4f46e5' },
    { label: 'Blue', value: '#2563eb' },
    { label: 'Emerald', value: '#059669' },
    { label: 'Amber', value: '#d97706' },
    { label: 'Rose', value: '#e11d48' },
    { label: 'Purple', value: '#7c3aed' },
];

const HIGHLIGHT_PALETTE = [
    { label: 'None', value: 'transparent' },
    { label: 'Yellow', value: '#fef08a' },
    { label: 'Green', value: '#bbf7d0' },
    { label: 'Blue', value: '#bfdbfe' },
    { label: 'Purple', value: '#e9d5ff' },
    { label: 'Pink', value: '#fbcfe8' },
];

export function TextProperties({ block }: TextPropertiesProps) {
    const dispatch = useDispatch();
    const content = block.content || {};
    const styles = block.styles || {};

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

    // Typography preset handler (H1, H2, H3, Paragraph, Lead, Quote)
    const handleTypographyLevel = (level: string) => {
        let newFontSize = styles.fontSize || 16;
        let newFontWeight = styles.fontWeight || 'normal';
        let newLevel = level;

        if (level === 'h1') {
            newFontSize = 28;
            newFontWeight = 'bold';
        } else if (level === 'h2') {
            newFontSize = 22;
            newFontWeight = 'bold';
        } else if (level === 'h3') {
            newFontSize = 18;
            newFontWeight = 'semibold';
        } else if (level === 'p') {
            newFontSize = 15;
            newFontWeight = 'normal';
        } else if (level === 'quote') {
            newFontSize = 16;
            newFontWeight = 'normal';
        }

        dispatch(updateBlock({
            id: block.id,
            updates: {
                content: { ...content, level: newLevel },
                styles: {
                    ...styles,
                    fontSize: newFontSize,
                    fontWeight: newLevel.startsWith('h') ? 'bold' : 'normal',
                }
            }
        }));
    };

    const fontSizeNum = Number(styles.fontSize) || 16;
    const currentLevel = content.level || (fontSizeNum >= 26 ? 'h1' : fontSizeNum >= 20 ? 'h2' : fontSizeNum >= 17 ? 'h3' : 'p');

    return (
        <div className="p-4 space-y-5 text-xs text-gray-700">
            {/* Header info */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <span className="font-bold text-gray-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5 text-indigo-600" />
                    Text & Typography
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold uppercase">
                    {currentLevel}
                </span>
            </div>

            {/* Typography Presets (H1, H2, H3, P, Quote) */}
            <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-700">Typography Preset</label>
                <div className="grid grid-cols-5 gap-1 p-1 bg-gray-100 rounded-xl">
                    <button
                        type="button"
                        onClick={() => handleTypographyLevel('p')}
                        className={clsx(
                            "py-1.5 rounded-lg text-xs font-semibold transition-all",
                            currentLevel === 'p' ? "bg-white text-indigo-600 shadow-2xs" : "text-gray-600 hover:text-gray-900"
                        )}
                        title="Paragraph"
                    >
                        P
                    </button>
                    <button
                        type="button"
                        onClick={() => handleTypographyLevel('h1')}
                        className={clsx(
                            "py-1.5 rounded-lg text-xs font-bold transition-all",
                            currentLevel === 'h1' ? "bg-white text-indigo-600 shadow-2xs" : "text-gray-600 hover:text-gray-900"
                        )}
                        title="Heading 1"
                    >
                        H1
                    </button>
                    <button
                        type="button"
                        onClick={() => handleTypographyLevel('h2')}
                        className={clsx(
                            "py-1.5 rounded-lg text-xs font-bold transition-all",
                            currentLevel === 'h2' ? "bg-white text-indigo-600 shadow-2xs" : "text-gray-600 hover:text-gray-900"
                        )}
                        title="Heading 2"
                    >
                        H2
                    </button>
                    <button
                        type="button"
                        onClick={() => handleTypographyLevel('h3')}
                        className={clsx(
                            "py-1.5 rounded-lg text-xs font-bold transition-all",
                            currentLevel === 'h3' ? "bg-white text-indigo-600 shadow-2xs" : "text-gray-600 hover:text-gray-900"
                        )}
                        title="Heading 3"
                    >
                        H3
                    </button>
                    <button
                        type="button"
                        onClick={() => handleTypographyLevel('quote')}
                        className={clsx(
                            "py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center",
                            currentLevel === 'quote' ? "bg-white text-indigo-600 shadow-2xs" : "text-gray-600 hover:text-gray-900"
                        )}
                        title="Blockquote"
                    >
                        <Quote className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* Font Family (Google Fonts API) */}
            <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700">Font Family</label>
                <GoogleFontPicker
                    value={String(styles.fontFamily || 'Inter, sans-serif')}
                    onChange={(font) => handleStyleChange('fontFamily', font)}
                />
            </div>

            {/* Font Size & Weight */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700">Font Size (px)</label>
                    <div className="flex items-center gap-1.5">
                        <input
                            type="number"
                            min="10"
                            max="72"
                            value={styles.fontSize || 16}
                            onChange={(e) => handleStyleChange('fontSize', Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-medium"
                        />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700">Font Weight</label>
                    <select
                        value={styles.fontWeight || 'normal'}
                        onChange={(e) => handleStyleChange('fontWeight', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-medium bg-white"
                    >
                        <option value="normal">Normal (400)</option>
                        <option value="medium">Medium (500)</option>
                        <option value="semibold">Semibold (600)</option>
                        <option value="bold">Bold (700)</option>
                        <option value="black">Black (900)</option>
                    </select>
                </div>
            </div>

            {/* Quick Formatting Toggles (Bold, Italic, Underline, Strikethrough) */}
            <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-700">Text Styling & Decoration</label>
                <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
                    <button
                        type="button"
                        onClick={() => handleStyleChange('fontWeight', styles.fontWeight === 'bold' || styles.fontWeight === '700' ? 'normal' : 'bold')}
                        className={clsx(
                            "flex-1 py-1.5 flex items-center justify-center rounded-lg transition-all cursor-pointer font-bold",
                            styles.fontWeight === 'bold' || styles.fontWeight === '700'
                                ? "bg-white text-indigo-600 shadow-2xs"
                                : "text-gray-600 hover:text-gray-900"
                        )}
                        title="Bold (Ctrl+B)"
                    >
                        <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => handleStyleChange('fontStyle', styles.fontStyle === 'italic' ? 'normal' : 'italic')}
                        className={clsx(
                            "flex-1 py-1.5 flex items-center justify-center rounded-lg transition-all cursor-pointer",
                            styles.fontStyle === 'italic'
                                ? "bg-white text-indigo-600 shadow-2xs font-bold"
                                : "text-gray-600 hover:text-gray-900"
                        )}
                        title="Italic (Ctrl+I)"
                    >
                        <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => handleStyleChange('textDecoration', styles.textDecoration === 'underline' ? 'none' : 'underline')}
                        className={clsx(
                            "flex-1 py-1.5 flex items-center justify-center rounded-lg transition-all cursor-pointer",
                            styles.textDecoration === 'underline'
                                ? "bg-white text-indigo-600 shadow-2xs font-bold"
                                : "text-gray-600 hover:text-gray-900"
                        )}
                        title="Underline (Ctrl+U)"
                    >
                        <Underline className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => handleStyleChange('textTransform', styles.textTransform === 'uppercase' ? 'none' : 'uppercase')}
                        className={clsx(
                            "flex-1 py-1.5 flex items-center justify-center rounded-lg transition-all cursor-pointer text-[11px] font-bold",
                            styles.textTransform === 'uppercase'
                                ? "bg-white text-indigo-600 shadow-2xs"
                                : "text-gray-600 hover:text-gray-900"
                        )}
                        title="Uppercase (ALL CAPS)"
                    >
                        TT
                    </button>
                </div>
            </div>

            {/* Alignment Controls */}
            <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-700">Text Alignment</label>
                <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
                    {[
                        { align: 'left', icon: <AlignLeft className="w-3.5 h-3.5" /> },
                        { align: 'center', icon: <AlignCenter className="w-3.5 h-3.5" /> },
                        { align: 'right', icon: <AlignRight className="w-3.5 h-3.5" /> },
                        { align: 'justify', icon: <AlignJustify className="w-3.5 h-3.5" /> },
                    ].map((item) => (
                        <button
                            key={item.align}
                            type="button"
                            onClick={() => handleStyleChange('alignment', item.align)}
                            className={clsx(
                                "flex-1 py-1.5 flex items-center justify-center rounded-lg transition-all cursor-pointer",
                                (styles.alignment || 'left') === item.align
                                    ? "bg-white text-indigo-600 shadow-2xs font-bold"
                                    : "text-gray-500 hover:text-gray-800"
                            )}
                        >
                            {item.icon}
                        </button>
                    ))}
                </div>
            </div>

            {/* Line Height & Letter Spacing */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700">Line Height</label>
                    <select
                        value={styles.lineHeight || 1.6}
                        onChange={(e) => handleStyleChange('lineHeight', Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-medium bg-white"
                    >
                        <option value={1.2}>Tight (1.2)</option>
                        <option value={1.4}>Snug (1.4)</option>
                        <option value={1.6}>Normal (1.6)</option>
                        <option value={1.8}>Relaxed (1.8)</option>
                        <option value={2.0}>Loose (2.0)</option>
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700">Letter Spacing</label>
                    <select
                        value={styles.letterSpacing || 'normal'}
                        onChange={(e) => handleStyleChange('letterSpacing', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-medium bg-white"
                    >
                        <option value="tight">Tight</option>
                        <option value="normal">Normal</option>
                        <option value="wide">Wide</option>
                    </select>
                </div>
            </div>

            {/* Text Color Palette */}
            <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-700 flex items-center justify-between">
                    <span>Text Color</span>
                    <span className="font-mono text-[10px] text-gray-400">{styles.color || '#111827'}</span>
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                    {COLOR_PALETTE.map((c) => (
                        <button
                            key={c.value}
                            type="button"
                            onClick={() => handleStyleChange('color', c.value)}
                            style={{ backgroundColor: c.value }}
                            className={clsx(
                                "w-6 h-6 rounded-full border transition-transform shadow-2xs",
                                (styles.color || '#111827') === c.value
                                    ? "scale-110 ring-2 ring-indigo-500 ring-offset-1 border-white"
                                    : "border-gray-200 hover:scale-105"
                            )}
                            title={c.label}
                        />
                    ))}
                </div>
            </div>

            {/* Highlight Background */}
            <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-700 flex items-center justify-between">
                    <span>Background Highlight</span>
                    <span className="font-mono text-[10px] text-gray-400">{styles.backgroundColor || 'transparent'}</span>
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                    {HIGHLIGHT_PALETTE.map((c) => (
                        <button
                            key={c.value}
                            type="button"
                            onClick={() => handleStyleChange('backgroundColor', c.value)}
                            style={{ backgroundColor: c.value === 'transparent' ? '#f3f4f6' : c.value }}
                            className={clsx(
                                "w-6 h-6 rounded-lg border transition-transform shadow-2xs flex items-center justify-center text-[9px] font-bold",
                                (styles.backgroundColor || 'transparent') === c.value
                                    ? "scale-110 ring-2 ring-indigo-500 ring-offset-1 border-white"
                                    : "border-gray-200 hover:scale-105"
                            )}
                            title={c.label}
                        >
                            {c.value === 'transparent' ? '✕' : ''}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
