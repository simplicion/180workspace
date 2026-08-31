'use client';

import React from 'react';
import { useDispatch } from 'react-redux';
import { updateBlock, Block } from '@/redux/slices/documentSlice';
import { 
    Columns, 
    Rows, 
    Square, 
    LayoutGrid, 
    AlignLeft, 
    AlignCenter, 
    AlignRight,
    AlignHorizontalSpaceBetween,
    AlignHorizontalSpaceAround,
    Plus,
    Trash2,
    MoveLeft,
    MoveRight,
    Type,
    FileBadge2,
    Image as ImageIcon
} from 'lucide-react';
import clsx from 'clsx';

interface ContainerPropertiesProps {
    block: Block;
}

const BG_PRESETS = [
    { label: 'Transparent', value: 'transparent' },
    { label: 'White', value: '#ffffff' },
    { label: 'Slate', value: '#f8fafc' },
    { label: 'Gray', value: '#f3f4f6' },
    { label: 'Blue', value: '#eff6ff' },
    { label: 'Green', value: '#f0fdf4' },
    { label: 'Amber', value: '#fffbeb' }
];

const BORDER_COLORS = [
    { label: 'Default Gray', value: '#e2e8f0' },
    { label: 'Dark Slate', value: '#94a3b8' },
    { label: 'Indigo', value: '#c7d2fe' },
    { label: 'Emerald', value: '#a7f3d0' },
    { label: 'Amber', value: '#fde68a' }
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
    { label: '0px', value: '0px' },
    { label: '8px', value: '8px' },
    { label: '12px', value: '12px' },
    { label: '16px', value: '16px' },
    { label: '24px', value: '24px' },
    { label: '32px', value: '32px' }
];

export function ContainerProperties({ block }: ContainerPropertiesProps) {
    const dispatch = useDispatch();
    const content = block.content || {};
    const styles = block.styles || {};
    const children = Array.isArray(content.children) ? content.children : [];

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

    const addChild = (type: 'signature' | 'text' | 'box' | 'image') => {
        const newId = 'child-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
        let newChild: any;

        if (type === 'signature') {
            newChild = {
                id: newId,
                type: 'signature',
                content: { label: 'Authorized Signatory', requireName: true },
                width: (content.direction || 'row') === 'row' ? '45%' : '100%'
            };
        } else if (type === 'text') {
            newChild = {
                id: newId,
                type: 'text',
                content: { text: 'New container text block...' },
                styles: { fontSize: 14, color: '#374151' },
                width: (content.direction || 'row') === 'row' ? '45%' : '100%'
            };
        } else if (type === 'image') {
            newChild = {
                id: newId,
                type: 'image',
                content: { url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&auto=format&fit=crop' },
                width: (content.direction || 'row') === 'row' ? '45%' : '100%'
            };
        } else {
            newChild = {
                id: newId,
                type: 'box',
                content: { text: 'Sub-card callout item' },
                styles: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderRadius: 8, padding: '12px' },
                width: (content.direction || 'row') === 'row' ? '45%' : '100%'
            };
        }

        handleContentChange('children', [...children, newChild]);
    };

    const removeChild = (childId: string) => {
        handleContentChange('children', children.filter((c: any) => c.id !== childId));
    };

    const moveChild = (index: number, dir: 'left' | 'right') => {
        const newIndex = dir === 'left' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= children.length) return;
        const newChildren = [...children];
        const [moved] = newChildren.splice(index, 1);
        newChildren.splice(newIndex, 0, moved);
        handleContentChange('children', newChildren);
    };

    const direction = content.direction || 'row';
    const gap = content.gap ?? 16;
    const isWrap = content.wrap !== false;
    const currentBg = styles.backgroundColor || 'transparent';
    const currentBorderColor = styles.borderColor || '#e2e8f0';
    const currentRadius = styles.borderRadius !== undefined ? Number(styles.borderRadius) : 8;
    const currentBorderWidth = styles.borderWidth !== undefined ? Number(styles.borderWidth) : 1;
    const currentBorderStyle = styles.borderStyle || 'dashed';
    const currentPadding = styles.padding || '16px';

    return (
        <div className="p-4 space-y-5 text-xs text-gray-700">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <span className="font-bold text-gray-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <LayoutGrid className="w-3.5 h-3.5 text-indigo-600" />
                    Container & Layout
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold uppercase">
                    Flexbox
                </span>
            </div>

            {/* Layout Direction: Row (Horizontal) vs Column (Vertical) */}
            <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-700">Layout Direction</label>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => handleContentChange('direction', 'row')}
                        className={clsx(
                            "py-2 px-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all text-xs cursor-pointer",
                            direction === 'row'
                                ? "bg-indigo-50/80 border-indigo-500 text-indigo-700 shadow-2xs"
                                : "border-gray-200 hover:border-gray-300 text-gray-600 bg-white"
                        )}
                    >
                        <Columns className="w-4 h-4 text-indigo-600" />
                        <span>Row (Horizontal)</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleContentChange('direction', 'column')}
                        className={clsx(
                            "py-2 px-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all text-xs cursor-pointer",
                            direction === 'column'
                                ? "bg-indigo-50/80 border-indigo-500 text-indigo-700 shadow-2xs"
                                : "border-gray-200 hover:border-gray-300 text-gray-600 bg-white"
                        )}
                    >
                        <Rows className="w-4 h-4 text-indigo-600" />
                        <span>Column (Vertical)</span>
                    </button>
                </div>
            </div>

            {/* Gap Slider */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-gray-700">Item Spacing / Gap</label>
                    <span className="font-mono text-[10px] text-indigo-600 font-semibold">{gap}px</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="64"
                    step="4"
                    value={gap}
                    onChange={(e) => handleContentChange('gap', Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
            </div>

            {/* Justify Content */}
            <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-700">Content Alignment (Justify)</label>
                <div className="grid grid-cols-4 gap-1 p-1 bg-gray-100 rounded-xl text-[10px] font-medium">
                    {[
                        { label: 'Start', value: 'flex-start' },
                        { label: 'Center', value: 'center' },
                        { label: 'End', value: 'flex-end' },
                        { label: 'Between', value: 'space-between' },
                    ].map((item) => (
                        <button
                            key={item.value}
                            type="button"
                            onClick={() => handleContentChange('justifyContent', item.value)}
                            className={clsx(
                                "py-1.5 rounded-lg transition-all text-center cursor-pointer",
                                (content.justifyContent || 'flex-start') === item.value
                                    ? "bg-white text-indigo-600 font-bold shadow-2xs"
                                    : "text-gray-600 hover:text-gray-900"
                            )}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Wrap Items */}
            <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                    <span className="text-[11px] font-bold text-gray-800 block">Wrap Items</span>
                    <span className="text-[10px] text-gray-400">Allow items to wrap onto multiple lines</span>
                </div>
                <input
                    type="checkbox"
                    checked={isWrap}
                    onChange={(e) => handleContentChange('wrap', e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                />
            </div>

            {/* Background Fill */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
                <label className="text-[11px] font-bold text-gray-700 flex items-center justify-between">
                    <span>Container Background</span>
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
                        title="Custom Background Color"
                    />
                </div>
            </div>

            {/* Border Width & Style */}
            <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-700 block">Border Width & Style</label>
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

            {/* Corner Radius */}
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

            {/* Padding */}
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

            {/* Child Elements Management */}
            <div className="space-y-3 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900 text-[11px]">Child Elements ({children.length})</span>
                </div>

                {/* Add Child Buttons */}
                <div className="grid grid-cols-2 gap-1.5">
                    <button
                        type="button"
                        onClick={() => addChild('text')}
                        className="py-1.5 px-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-semibold text-gray-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                        <Type className="w-3.5 h-3.5 text-blue-600" />
                        <span>+ Text Item</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => addChild('signature')}
                        className="py-1.5 px-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-semibold text-gray-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                        <FileBadge2 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>+ Signature</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => addChild('box')}
                        className="py-1.5 px-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-semibold text-gray-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                        <Square className="w-3.5 h-3.5 text-purple-600" />
                        <span>+ Box Item</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => addChild('image')}
                        className="py-1.5 px-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-semibold text-gray-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                        <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                        <span>+ Image</span>
                    </button>
                </div>

                {/* Children List */}
                {children.length > 0 && (
                    <div className="space-y-1.5 mt-2">
                        {children.map((child: any, idx: number) => (
                            <div
                                key={child.id}
                                className="p-2 bg-gray-50 border border-gray-200/80 rounded-lg flex items-center justify-between gap-2"
                            >
                                <div className="flex items-center gap-1.5 text-xs text-gray-700 font-medium truncate">
                                    <span className="text-[10px] font-mono text-gray-400">#{idx + 1}</span>
                                    <span className="capitalize font-semibold">{child.type}</span>
                                    <span className="text-[10px] text-gray-400 truncate max-w-[90px]">
                                        {child.content?.label || child.content?.text?.slice(0, 15) || ''}
                                    </span>
                                </div>

                                <div className="flex items-center gap-1">
                                    {idx > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => moveChild(idx, 'left')}
                                            className="p-1 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-200 cursor-pointer"
                                            title="Move Up/Left"
                                        >
                                            <MoveLeft className="w-3 h-3" />
                                        </button>
                                    )}
                                    {idx < children.length - 1 && (
                                        <button
                                            type="button"
                                            onClick={() => moveChild(idx, 'right')}
                                            className="p-1 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-200 cursor-pointer"
                                            title="Move Down/Right"
                                        >
                                            <MoveRight className="w-3 h-3" />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => removeChild(child.id)}
                                        className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer"
                                        title="Delete Child"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
