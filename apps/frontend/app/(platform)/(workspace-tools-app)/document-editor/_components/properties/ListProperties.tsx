'use client';

import React from 'react';
import { useDispatch } from 'react-redux';
import { updateBlock, Block } from '@/redux/slices/documentSlice';
import { List, ListOrdered, CheckSquare, Plus, Trash2 } from 'lucide-react';
import clsx from 'clsx';

interface ListPropertiesProps {
    block: Block;
}

export function ListProperties({ block }: ListPropertiesProps) {
    const dispatch = useDispatch();
    const content = block.content || {};
    const styles = block.styles || {};
    const items = content.items || ['First item', 'Second item'];
    const listStyle = content.listStyle || 'bullet';

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

    const handleAddItem = () => {
        handleContentChange('items', [...items, 'New list item']);
    };

    const handleRemoveItem = (index: number) => {
        handleContentChange('items', items.filter((_: any, i: number) => i !== index));
    };

    const handleUpdateItem = (index: number, text: string) => {
        const updated = [...items];
        updated[index] = text;
        handleContentChange('items', updated);
    };

    return (
        <div className="p-4 space-y-5 text-xs text-gray-700">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <span className="font-bold text-gray-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <List className="w-3.5 h-3.5 text-indigo-600" />
                    List Properties
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold uppercase">
                    {listStyle}
                </span>
            </div>

            {/* List Style (Bullet / Numbered / Checklist) */}
            <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-700">List Style</label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 rounded-xl text-center font-medium">
                    {[
                        { style: 'bullet', label: 'Bullet', icon: <List className="w-3.5 h-3.5" /> },
                        { style: 'numbered', label: 'Numbered', icon: <ListOrdered className="w-3.5 h-3.5" /> },
                        { style: 'checklist', label: 'Checklist', icon: <CheckSquare className="w-3.5 h-3.5" /> },
                    ].map((item) => (
                        <button
                            key={item.style}
                            type="button"
                            onClick={() => handleContentChange('listStyle', item.style)}
                            className={clsx(
                                "py-2 rounded-lg text-xs flex flex-col items-center gap-1 transition-all",
                                listStyle === item.style
                                    ? "bg-white text-indigo-600 font-bold shadow-2xs"
                                    : "text-gray-600 hover:text-gray-900"
                            )}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* List Items Editor */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-gray-700">Items ({items.length})</label>
                    <button
                        type="button"
                        onClick={handleAddItem}
                        className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                    >
                        <Plus className="w-3 h-3" /> Add Item
                    </button>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {items.map((item: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-1.5">
                            <span className="text-[10px] text-gray-400 font-mono w-4 text-center">{idx + 1}.</span>
                            <input
                                type="text"
                                value={item}
                                onChange={(e) => handleUpdateItem(idx, e.target.value)}
                                className="flex-1 px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-medium"
                            />
                            <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="text-gray-400 hover:text-rose-600 p-1"
                                title="Delete item"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Item Spacing */}
            <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700">Line Spacing (px)</label>
                <input
                    type="number"
                    min="2"
                    max="24"
                    value={styles.itemSpacing ?? 6}
                    onChange={(e) => handleStyleChange('itemSpacing', Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-medium"
                />
            </div>
        </div>
    );
}
