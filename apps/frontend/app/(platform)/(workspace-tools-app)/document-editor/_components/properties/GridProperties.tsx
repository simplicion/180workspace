'use client';

import React from 'react';
import { useDispatch } from 'react-redux';
import { updateBlock, Block } from '@/redux/slices/documentSlice';
import { Grid, Plus, Minus, LayoutGrid, Palette } from 'lucide-react';
import clsx from 'clsx';

interface GridPropertiesProps {
    block: Block;
}

export function GridProperties({ block }: GridPropertiesProps) {
    const dispatch = useDispatch();
    const content = block.content || {};
    const styles = block.styles || {};
    const data = content.data || [
        ['Header 1', 'Header 2', 'Header 3'],
        ['Cell 1', 'Cell 2', 'Cell 3']
    ];

    const rowsCount = data.length;
    const colsCount = data[0]?.length || 3;

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

    const handleAddRow = () => {
        const newRow = new Array(colsCount).fill('New Cell');
        handleContentChange('data', [...data, newRow]);
    };

    const handleRemoveRow = () => {
        if (rowsCount > 1) {
            handleContentChange('data', data.slice(0, rowsCount - 1));
        }
    };

    const handleAddCol = () => {
        const updated = data.map((row: string[], idx: number) => [...row, idx === 0 ? `Header ${colsCount + 1}` : 'Cell']);
        handleContentChange('data', updated);
    };

    const handleRemoveCol = () => {
        if (colsCount > 1) {
            const updated = data.map((row: string[]) => row.slice(0, colsCount - 1));
            handleContentChange('data', updated);
        }
    };

    return (
        <div className="p-4 space-y-5 text-xs text-gray-700">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <span className="font-bold text-gray-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Grid className="w-3.5 h-3.5 text-indigo-600" />
                    Data Grid & Table
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold">
                    {rowsCount} × {colsCount}
                </span>
            </div>

            {/* Row & Column Adjusters */}
            <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/80 space-y-2">
                    <span className="text-[11px] font-bold text-gray-800 block">Rows ({rowsCount})</span>
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={handleRemoveRow}
                            disabled={rowsCount <= 1}
                            className="p-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40"
                        >
                            <Minus className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={handleAddRow}
                            className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/80 space-y-2">
                    <span className="text-[11px] font-bold text-gray-800 block">Columns ({colsCount})</span>
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={handleRemoveCol}
                            disabled={colsCount <= 1}
                            className="p-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40"
                        >
                            <Minus className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={handleAddCol}
                            className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Header Background */}
            <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700">Header Background Color</label>
                <input
                    type="text"
                    value={styles.headerBg || '#f8fafc'}
                    onChange={(e) => handleStyleChange('headerBg', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-medium"
                />
            </div>

            {/* Cell Padding */}
            <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700">Cell Padding (px)</label>
                <input
                    type="number"
                    min="4"
                    max="32"
                    value={styles.cellPadding ?? 10}
                    onChange={(e) => handleStyleChange('cellPadding', Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-medium"
                />
            </div>
        </div>
    );
}
