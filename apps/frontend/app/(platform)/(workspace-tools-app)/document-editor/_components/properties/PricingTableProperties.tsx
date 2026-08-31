'use client';

import React from 'react';
import { useDispatch } from 'react-redux';
import { updateBlock, Block } from '@/redux/slices/documentSlice';
import { 
    Calculator, 
    DollarSign, 
    Plus, 
    Trash2, 
    Percent, 
    Layers, 
    CheckSquare,
    Eye
} from 'lucide-react';
import clsx from 'clsx';

interface PricingTablePropertiesProps {
    block: Block;
}

export function PricingTableProperties({ block }: PricingTablePropertiesProps) {
    const dispatch = useDispatch();
    const content = block.content || {};
    const items = content.items || [];
    const currency = content.currency || 'USD';
    const taxRate = content.taxRate ?? 18;
    const discount = content.discount ?? 0;

    const recalculateTotals = (newItems: any[], newTax: number, newDisc: number) => {
        const subtotal = newItems.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.rate || 0)), 0);
        const taxAmount = (subtotal * Number(newTax || 0)) / 100;
        const grandTotal = Math.max(0, subtotal + taxAmount - Number(newDisc || 0));

        dispatch(updateBlock({
            id: block.id,
            updates: {
                content: {
                    ...content,
                    items: newItems,
                    taxRate: Number(newTax),
                    discount: Number(newDisc),
                    subtotal,
                    taxAmount,
                    grandTotal
                }
            }
        }));
    };

    const handleAddItem = () => {
        const newItem = {
            id: 'item-' + Date.now(),
            description: 'New Deliverable Item',
            quantity: 1,
            rate: 1000,
            taxRate: taxRate,
            amount: 1000
        };
        recalculateTotals([...items, newItem], taxRate, discount);
    };

    const handleRemoveItem = (index: number) => {
        const updated = items.filter((_: any, i: number) => i !== index);
        recalculateTotals(updated, taxRate, discount);
    };

    const handleUpdateItem = (index: number, key: string, val: any) => {
        const updated = items.map((item: any, i: number) => {
            if (i === index) {
                const mod = { ...item, [key]: val };
                if (key === 'quantity' || key === 'rate') {
                    mod.amount = Number(mod.quantity || 0) * Number(mod.rate || 0);
                }
                return mod;
            }
            return item;
        });
        recalculateTotals(updated, taxRate, discount);
    };

    const handleCurrencyChange = (curr: string) => {
        dispatch(updateBlock({
            id: block.id,
            updates: {
                content: {
                    ...content,
                    currency: curr
                }
            }
        }));
    };

    return (
        <div className="p-4 space-y-5 text-xs text-gray-700">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <span className="font-bold text-gray-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Calculator className="w-3.5 h-3.5 text-indigo-600" />
                    Pricing & Commercials
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold uppercase">
                    Live Calc
                </span>
            </div>

            {/* Currency Selector */}
            <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-700">Document Currency</label>
                <div className="grid grid-cols-4 gap-1 p-1 bg-gray-100 rounded-xl text-center font-bold">
                    {['USD', 'INR', 'EUR', 'GBP'].map((curr) => (
                        <button
                            key={curr}
                            type="button"
                            onClick={() => handleCurrencyChange(curr)}
                            className={clsx(
                                "py-1.5 rounded-lg text-xs transition-all",
                                currency === curr
                                    ? "bg-white text-indigo-600 shadow-2xs"
                                    : "text-gray-600 hover:text-gray-900"
                            )}
                        >
                            {curr}
                        </button>
                    ))}
                </div>
            </div>

            {/* Taxes & Discounts */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700">Default Tax (%)</label>
                    <input
                        type="number"
                        min="0"
                        max="100"
                        value={taxRate}
                        onChange={(e) => recalculateTotals(items, Number(e.target.value), discount)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-medium"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700">Fixed Discount ({currency === 'USD' ? '$' : '₹'})</label>
                    <input
                        type="number"
                        min="0"
                        value={discount}
                        onChange={(e) => recalculateTotals(items, taxRate, Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-medium"
                    />
                </div>
            </div>

            {/* Quick Item List Editor */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-gray-700">Line Items ({items.length})</label>
                    <button
                        type="button"
                        onClick={handleAddItem}
                        className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                    >
                        <Plus className="w-3 h-3" /> Add Item
                    </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {items.map((item: any, idx: number) => (
                        <div key={item.id || idx} className="p-2.5 rounded-xl border border-gray-200 bg-gray-50/60 space-y-1.5 text-[11px]">
                            <div className="flex items-center justify-between gap-2">
                                <input
                                    type="text"
                                    value={item.description || ''}
                                    onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                                    placeholder="Item description..."
                                    className="flex-1 px-2 py-1 rounded-md border border-gray-200 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                            <div className="grid grid-cols-2 gap-2">
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-gray-400">Qty:</span>
                                    <input
                                        type="number"
                                        min="1"
                                        value={item.quantity || 1}
                                        onChange={(e) => handleUpdateItem(idx, 'quantity', Number(e.target.value))}
                                        className="w-full px-1.5 py-0.5 rounded border border-gray-200 bg-white text-center"
                                    />
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-gray-400">Rate:</span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={item.rate || 0}
                                        onChange={(e) => handleUpdateItem(idx, 'rate', Number(e.target.value))}
                                        className="w-full px-1.5 py-0.5 rounded border border-gray-200 bg-white text-center font-mono"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Calculated Grand Total Snapshot */}
            <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-1">
                <div className="flex justify-between text-[11px] text-indigo-900 font-medium">
                    <span>Subtotal:</span>
                    <span>{currency} {Number(content.subtotal || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[11px] text-indigo-900 font-medium">
                    <span>Tax ({taxRate}%):</span>
                    <span>{currency} {Number(content.taxAmount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-indigo-950 font-bold pt-1 border-t border-indigo-200/80">
                    <span>Grand Total:</span>
                    <span>{currency} {Number(content.grandTotal || 0).toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
}
