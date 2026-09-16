import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { updateBlock, updateDocumentDetails, Block } from '@/redux/slices/documentSlice';
import { Plus, Trash2, Calculator, Percent, DollarSign } from 'lucide-react';
import clsx from 'clsx';

export interface PricingItem {
    id: string;
    description: string;
    quantity: number;
    rate: number;
    taxRate?: number;
    amount: number;
}

interface PricingTableBlockProps {
    block: Block;
    isSelected: boolean;
}

export function PricingTableBlock({ block, isSelected }: PricingTableBlockProps) {
    const dispatch = useDispatch();

    const items: PricingItem[] = block.content?.items || [
        { id: '1', description: 'Core Application Design & Wireframing', quantity: 1, rate: 25000, taxRate: 18, amount: 25000 },
        { id: '2', description: 'Frontend Development & API Integration', quantity: 1, rate: 45000, taxRate: 18, amount: 45000 },
        { id: '3', description: 'Quality Assurance & Staging Deployment', quantity: 1, rate: 15000, taxRate: 18, amount: 15000 },
    ];

    const discountPercent = block.content?.discountPercent || 0;
    const currency = block.content?.currency || 'INR';
    const currencySymbol = currency === 'USD' ? '$' : '₹';

    // Calculate totals
    const subtotal = items.reduce((acc, it) => acc + (Number(it.quantity || 1) * Number(it.rate || 0)), 0);
    const discountAmount = (subtotal * (Number(discountPercent) || 0)) / 100;
    const taxableSubtotal = subtotal - discountAmount;
    
    // Tax calculation per item or average
    const taxAmount = items.reduce((acc, it) => {
        const itemTotal = Number(it.quantity || 1) * Number(it.rate || 0);
        const itemTaxRate = Number(it.taxRate || 0);
        return acc + (itemTotal * itemTaxRate) / 100;
    }, 0);

    const grandTotal = taxableSubtotal + taxAmount;

    // Sync calculated grand total to document details
    useEffect(() => {
        dispatch(updateDocumentDetails({
            subtotal,
            discount: discountAmount,
            taxAmount,
            taxPercent: items.length > 0 ? Number(items[0].taxRate || 18) : 18,
            totalAmount: String(grandTotal),
            grandTotal,
            showTotalAmount: true
        }));
    }, [subtotal, discountAmount, taxAmount, grandTotal, dispatch]);

    const updateItem = (id: string, field: keyof PricingItem, value: any) => {
        const newItems = items.map(it => {
            if (it.id === id) {
                const updated = { ...it, [field]: value };
                if (field === 'quantity' || field === 'rate') {
                    updated.amount = Number(updated.quantity || 1) * Number(updated.rate || 0);
                }
                return updated;
            }
            return it;
        });

        dispatch(updateBlock({
            id: block.id,
            updates: {
                content: {
                    ...block.content,
                    items: newItems,
                    subtotal,
                    taxAmount,
                    grandTotal
                }
            }
        }));
    };

    const addItem = () => {
        const newItem: PricingItem = {
            id: Date.now().toString(),
            description: 'New Deliverable / Service',
            quantity: 1,
            rate: 10000,
            taxRate: 18,
            amount: 10000
        };

        dispatch(updateBlock({
            id: block.id,
            updates: {
                content: {
                    ...block.content,
                    items: [...items, newItem]
                }
            }
        }));
    };

    const removeItem = (id: string) => {
        if (items.length <= 1) return;
        const newItems = items.filter(it => it.id !== id);
        dispatch(updateBlock({
            id: block.id,
            updates: {
                content: {
                    ...block.content,
                    items: newItems
                }
            }
        }));
    };

    const updateDiscount = (val: number) => {
        dispatch(updateBlock({
            id: block.id,
            updates: {
                content: {
                    ...block.content,
                    discountPercent: Math.max(0, Math.min(100, val))
                }
            }
        }));
    };

    return (
        <div className={clsx('my-4 rounded-2xl border transition-all overflow-hidden bg-white shadow-sm', isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200')}>
            {/* Table Header */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Commercial Pricing Table</span>
                </div>
                <div className="text-xs font-semibold text-slate-500">
                    Currency: <span className="font-bold text-slate-800">{currencySymbol} ({currency})</span>
                </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-200 bg-slate-100/50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                            <th className="py-2.5 px-4 w-[50%]">Item & Description</th>
                            <th className="py-2.5 px-3 w-[12%] text-center">Qty / Hrs</th>
                            <th className="py-2.5 px-3 w-[18%] text-right">Rate ({currencySymbol})</th>
                            <th className="py-2.5 px-3 w-[12%] text-center">Tax %</th>
                            <th className="py-2.5 px-4 w-[18%] text-right">Total ({currencySymbol})</th>
                            <th className="py-2.5 px-2 w-[5%] text-center"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                        {items.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/60 transition-colors group">
                                <td className="py-2.5 px-4">
                                    <input
                                        type="text"
                                        value={item.description}
                                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                        placeholder="Service or Product name..."
                                        className="w-full bg-transparent font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 rounded px-1.5 py-1"
                                    />
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                    <input
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) => updateItem(item.id, 'quantity', Math.max(1, Number(e.target.value)))}
                                        className="w-16 text-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                    <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={item.rate}
                                        onChange={(e) => updateItem(item.id, 'rate', Math.max(0, Number(e.target.value)))}
                                        className="w-24 text-right bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={item.taxRate || 0}
                                        onChange={(e) => updateItem(item.id, 'taxRate', Math.max(0, Number(e.target.value)))}
                                        className="w-14 text-center bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-1 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                </td>
                                <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                                    {currencySymbol}{(Number(item.quantity || 1) * Number(item.rate || 0)).toLocaleString()}
                                </td>
                                <td className="py-2.5 px-2 text-center">
                                    {items.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeItem(item.id)}
                                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add Row Action */}
            <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
                >
                    <Plus className="w-3.5 h-3.5" /> Add Line Item
                </button>
            </div>

            {/* Calculations Summary Card */}
            <div className="border-t border-slate-200 bg-slate-50/80 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-600">Discount:</span>
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1 shadow-sm">
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={discountPercent}
                            onChange={(e) => updateDiscount(Number(e.target.value))}
                            className="w-12 text-xs font-bold text-slate-800 focus:outline-none text-right"
                        />
                        <Percent className="w-3 h-3 text-slate-400" />
                    </div>
                </div>

                <div className="w-full sm:w-64 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-500">
                        <span>Subtotal:</span>
                        <span className="font-semibold text-slate-800">{currencySymbol}{subtotal.toLocaleString()}</span>
                    </div>
                    {discountAmount > 0 && (
                        <div className="flex justify-between text-emerald-600">
                            <span>Discount ({discountPercent}%):</span>
                            <span className="font-semibold">-{currencySymbol}{discountAmount.toLocaleString()}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-slate-500">
                        <span>Estimated Tax:</span>
                        <span className="font-semibold text-slate-800">+{currencySymbol}{taxAmount.toLocaleString()}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                        <span className="font-bold text-slate-900 text-sm">Grand Total:</span>
                        <span className="font-black text-indigo-600 text-base">
                            {currencySymbol}{grandTotal.toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
