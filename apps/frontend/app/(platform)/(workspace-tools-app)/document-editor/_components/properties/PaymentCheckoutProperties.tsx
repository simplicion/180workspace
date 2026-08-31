'use client';

import React from 'react';
import { useDispatch } from 'react-redux';
import { updateBlock, Block } from '@/redux/slices/documentSlice';
import { 
    CreditCard, 
    Calendar, 
    Building2, 
    Plus, 
    Trash2, 
    Percent, 
    DollarSign, 
    Link2, 
    Shield, 
    Palette,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Maximize2,
    Zap,
    Smartphone
} from 'lucide-react';
import clsx from 'clsx';

interface PaymentCheckoutPropertiesProps {
    block: Block;
}

export function PaymentCheckoutProperties({ block }: PaymentCheckoutPropertiesProps) {
    const dispatch = useDispatch();
    const content = block.content || {};
    const mode = content.mode || 'button';

    const updateContent = (fields: Partial<any>) => {
        dispatch(updateBlock({
            id: block.id,
            updates: {
                content: {
                    ...content,
                    ...fields
                }
            }
        }));
    };

    // ─────────────────────────────────────────────────────────────────────────────
    // Milestone helpers
    // ─────────────────────────────────────────────────────────────────────────────
    const milestones = content.milestones || [];

    const handleAddMilestone = () => {
        const newMilestone = {
            id: 'm-' + Date.now(),
            title: `Phase ${milestones.length + 1}: Milestone Deliverable`,
            percentage: 25,
            amount: 5000,
            dueDate: 'Net 30 Days',
            status: 'pending'
        };
        updateContent({ milestones: [...milestones, newMilestone] });
    };

    const handleUpdateMilestone = (index: number, fields: any) => {
        const updated = [...milestones];
        updated[index] = { ...updated[index], ...fields };
        updateContent({ milestones: updated });
    };

    const handleRemoveMilestone = (index: number) => {
        const updated = milestones.filter((_: any, i: number) => i !== index);
        updateContent({ milestones: updated });
    };

    return (
        <div className="space-y-6">
            {/* Header / Mode Switcher */}
            <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">
                    Payment Block Mode
                </label>
                <div className="grid grid-cols-4 gap-1 p-1 bg-gray-100 rounded-xl border border-gray-200">
                    <button
                        type="button"
                        onClick={() => updateContent({ mode: 'button' })}
                        className={clsx(
                            "py-2 px-1 text-[10px] font-bold rounded-lg transition-all flex flex-col items-center gap-1 cursor-pointer text-center",
                            mode === 'button' 
                                ? "bg-white text-indigo-600 shadow-sm border border-black/5" 
                                : "text-gray-600 hover:text-gray-900"
                        )}
                    >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Pay Link</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => updateContent({ mode: 'milestones' })}
                        className={clsx(
                            "py-2 px-1 text-[10px] font-bold rounded-lg transition-all flex flex-col items-center gap-1 cursor-pointer text-center",
                            mode === 'milestones' 
                                ? "bg-white text-indigo-600 shadow-sm border border-black/5" 
                                : "text-gray-600 hover:text-gray-900"
                        )}
                    >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Milestones</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => updateContent({ mode: 'bank_transfer' })}
                        className={clsx(
                            "py-2 px-1 text-[10px] font-bold rounded-lg transition-all flex flex-col items-center gap-1 cursor-pointer text-center",
                            mode === 'bank_transfer' 
                                ? "bg-white text-indigo-600 shadow-sm border border-black/5" 
                                : "text-gray-600 hover:text-gray-900"
                        )}
                    >
                        <Building2 className="w-3.5 h-3.5" />
                        <span>Bank Wire</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => updateContent({ mode: 'upi_transfer' })}
                        className={clsx(
                            "py-2 px-1 text-[10px] font-bold rounded-lg transition-all flex flex-col items-center gap-1 cursor-pointer text-center",
                            mode === 'upi_transfer' || mode === 'upi'
                                ? "bg-white text-emerald-600 shadow-sm border border-black/5" 
                                : "text-gray-600 hover:text-gray-900"
                        )}
                    >
                        <Zap className="w-3.5 h-3.5" />
                        <span>UPI Pay</span>
                    </button>
                </div>
            </div>

            {/* ───────────────────────────────────────────────────────────────── */}
            {/* MODE 1: BUTTON / LINK CONTROLS */}
            {/* ───────────────────────────────────────────────────────────────── */}
            {mode === 'button' && (
                <div className="space-y-4">
                    {/* Gateway Picker */}
                    <div>
                        <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                            Payment Gateway
                        </label>
                        <select
                            value={content.gateway || 'razorpay'}
                            onChange={(e) => updateContent({ gateway: e.target.value })}
                            className="w-full text-xs font-medium bg-white border border-gray-200 rounded-lg p-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                            <option value="razorpay">Razorpay Payment Page / Link</option>
                            <option value="stripe">Stripe Checkout / Payment Link</option>
                            <option value="paypal">PayPal Payment Link</option>
                            <option value="upi">Instant UPI / QR Code Link</option>
                            <option value="custom">Custom Web Gateway URL</option>
                        </select>
                    </div>

                    {/* Button Text */}
                    <div>
                        <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                            Button CTA Label
                        </label>
                        <input
                            type="text"
                            value={content.buttonText || ''}
                            onChange={(e) => updateContent({ buttonText: e.target.value })}
                            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            placeholder="e.g. Pay via Razorpay"
                        />
                    </div>

                    {/* Payment URL */}
                    <div>
                        <label className="text-xs font-semibold text-gray-700 block mb-1.5 flex items-center justify-between">
                            <span>Payment URL / Link</span>
                            <Link2 className="w-3.5 h-3.5 text-gray-400" />
                        </label>
                        <input
                            type="url"
                            value={content.paymentUrl || ''}
                            onChange={(e) => updateContent({ paymentUrl: e.target.value })}
                            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                            placeholder="https://rzp.io/l/your-link"
                        />
                    </div>

                    {/* Amount Tag (Optional) */}
                    <div>
                        <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                            Display Amount Pill (Optional)
                        </label>
                        <input
                            type="text"
                            value={content.amountText || ''}
                            onChange={(e) => updateContent({ amountText: e.target.value })}
                            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg text-gray-800"
                            placeholder="e.g. ₹15,000.00"
                        />
                    </div>

                    {/* Button Style & Color */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                                Button Style
                            </label>
                            <select
                                value={content.buttonStyle || 'gradient'}
                                onChange={(e) => updateContent({ buttonStyle: e.target.value })}
                                className="w-full text-xs bg-white border border-gray-200 rounded-lg p-2 text-gray-800"
                            >
                                <option value="gradient">Gradient Glow</option>
                                <option value="solid">Solid Accent</option>
                                <option value="outline">Outline</option>
                                <option value="pill">Pill Rounded</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                                Button Color
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={content.buttonColor || '#4f46e5'}
                                    onChange={(e) => updateContent({ buttonColor: e.target.value })}
                                    className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0.5"
                                />
                                <span className="text-xs font-mono text-gray-500">{content.buttonColor || '#4f46e5'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Alignment */}
                    <div className="pt-2">
                        <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                            Button Alignment
                        </label>
                        <div className="grid grid-cols-4 gap-1.5 bg-gray-50 p-1 rounded-lg border border-gray-200">
                            {[
                                { id: 'left', label: 'Left', icon: <AlignLeft className="w-3.5 h-3.5" /> },
                                { id: 'center', label: 'Center', icon: <AlignCenter className="w-3.5 h-3.5" /> },
                                { id: 'right', label: 'Right', icon: <AlignRight className="w-3.5 h-3.5" /> },
                                { id: 'full', label: 'Full', icon: <Maximize2 className="w-3.5 h-3.5" /> },
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => updateContent({ buttonAlignment: opt.id })}
                                    className={clsx(
                                        "py-1.5 text-xs font-semibold rounded flex items-center justify-center gap-1 transition-all",
                                        (content.buttonAlignment || 'center') === opt.id
                                            ? "bg-white text-indigo-600 shadow-xs border border-gray-200"
                                            : "text-gray-500 hover:text-gray-800"
                                    )}
                                >
                                    {opt.icon}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ───────────────────────────────────────────────────────────────── */}
            {/* MODE 2: MILESTONE SCHEDULE CONTROLS */}
            {/* ───────────────────────────────────────────────────────────────── */}
            {mode === 'milestones' && (
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                            Milestone Schedule Title
                        </label>
                        <input
                            type="text"
                            value={content.milestoneTitle || ''}
                            onChange={(e) => updateContent({ milestoneTitle: e.target.value })}
                            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg text-gray-800"
                            placeholder="Project Payment Milestones"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                            Currency
                        </label>
                        <select
                            value={content.milestoneCurrency || 'INR'}
                            onChange={(e) => updateContent({ milestoneCurrency: e.target.value })}
                            className="w-full text-xs bg-white border border-gray-200 rounded-lg p-2 text-gray-800"
                        >
                            <option value="INR">INR (₹) - Indian Rupee</option>
                            <option value="USD">USD ($) - US Dollar</option>
                            <option value="EUR">EUR (€) - Euro</option>
                            <option value="GBP">GBP (£) - British Pound</option>
                        </select>
                    </div>

                    {/* Milestone Items List */}
                    <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-gray-700">
                                Deliverable Installments ({milestones.length})
                            </label>
                            <button
                                type="button"
                                onClick={handleAddMilestone}
                                className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md"
                            >
                                <Plus className="w-3 h-3" /> Add Phase
                            </button>
                        </div>

                        {milestones.map((m: any, idx: number) => (
                            <div key={m.id || idx} className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2.5">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[10px] font-bold uppercase text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                        Phase {idx + 1}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveMilestone(idx)}
                                        className="text-gray-400 hover:text-rose-600 transition-colors p-1"
                                        title="Remove Milestone"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                <div>
                                    <label className="text-[10px] text-gray-500 font-medium block mb-0.5">Phase Title / Deliverable</label>
                                    <input
                                        type="text"
                                        value={m.title || ''}
                                        onChange={(e) => handleUpdateMilestone(idx, { title: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-md text-gray-800"
                                        placeholder="e.g. Design Prototype Approval"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] text-gray-500 font-medium block mb-0.5">Percentage (%)</label>
                                        <input
                                            type="number"
                                            value={m.percentage || 0}
                                            onChange={(e) => handleUpdateMilestone(idx, { percentage: Number(e.target.value) })}
                                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-md text-gray-800"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-500 font-medium block mb-0.5">Amount ({content.milestoneCurrency || '₹'})</label>
                                        <input
                                            type="number"
                                            value={m.amount || 0}
                                            onChange={(e) => handleUpdateMilestone(idx, { amount: Number(e.target.value) })}
                                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-md text-gray-800"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] text-gray-500 font-medium block mb-0.5">Due Timing</label>
                                        <input
                                            type="text"
                                            value={m.dueDate || ''}
                                            onChange={(e) => handleUpdateMilestone(idx, { dueDate: e.target.value })}
                                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-md text-gray-800"
                                            placeholder="e.g. Net 15 Days"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-500 font-medium block mb-0.5">Status</label>
                                        <select
                                            value={m.status || 'pending'}
                                            onChange={(e) => handleUpdateMilestone(idx, { status: e.target.value })}
                                            className="w-full text-xs bg-white border border-gray-200 rounded-md p-1.5 text-gray-800"
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="paid">Paid</option>
                                            <option value="overdue">Overdue</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ───────────────────────────────────────────────────────────────── */}
            {/* MODE 3: DIRECT BANK WIRE TRANSFER CONTROLS */}
            {/* ───────────────────────────────────────────────────────────────── */}
            {mode === 'bank_transfer' && (
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                            Card Title
                        </label>
                        <input
                            type="text"
                            value={content.bankDetailsTitle || ''}
                            onChange={(e) => updateContent({ bankDetailsTitle: e.target.value })}
                            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg text-gray-800"
                            placeholder="Direct Bank & Wire Transfer Details"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                            Account Beneficiary Name
                        </label>
                        <input
                            type="text"
                            value={content.accountHolderName || ''}
                            onChange={(e) => updateContent({ accountHolderName: e.target.value })}
                            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg text-gray-800"
                            placeholder="Acme Technologies Pvt Ltd"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                                Bank Name
                            </label>
                            <input
                                type="text"
                                value={content.bankName || ''}
                                onChange={(e) => updateContent({ bankName: e.target.value })}
                                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg text-gray-800"
                                placeholder="HDFC Bank"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                                IFSC / SWIFT Code
                            </label>
                            <input
                                type="text"
                                value={content.ifscOrSwiftCode || ''}
                                onChange={(e) => updateContent({ ifscOrSwiftCode: e.target.value })}
                                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg text-gray-800 font-mono uppercase"
                                placeholder="HDFC0001234"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                            Account Number
                        </label>
                        <input
                            type="text"
                            value={content.accountNumber || ''}
                            onChange={(e) => updateContent({ accountNumber: e.target.value })}
                            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg text-gray-800 font-mono"
                            placeholder="50200012345678"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                            IBAN (International Wire - Optional)
                        </label>
                        <input
                            type="text"
                            value={content.iban || ''}
                            onChange={(e) => updateContent({ iban: e.target.value })}
                            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg text-gray-800 font-mono uppercase"
                            placeholder="GB29HDFC00012345678901"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                            Payment Reference / Wire Instructions
                        </label>
                        <textarea
                            rows={2}
                            value={content.additionalInstructions || ''}
                            onChange={(e) => updateContent({ additionalInstructions: e.target.value })}
                            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none"
                            placeholder="Please mention invoice number in wire remarks..."
                        />
                    </div>
                </div>
            )}

            {/* ───────────────────────────────────────────────────────────────── */}
            {/* MODE 4: INSTANT UPI TRANSFER CONTROLS */}
            {/* ───────────────────────────────────────────────────────────────── */}
            {(mode === 'upi_transfer' || mode === 'upi') && (
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                            Card Title
                        </label>
                        <input
                            type="text"
                            value={content.upiDetailsTitle || 'Instant UPI & QR Transfer'}
                            onChange={(e) => updateContent({ upiDetailsTitle: e.target.value })}
                            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg text-gray-800"
                            placeholder="Instant UPI & QR Transfer"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-emerald-800 block mb-1.5">
                            UPI ID / VPA Handle <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={content.upiId || ''}
                            onChange={(e) => updateContent({ upiId: e.target.value })}
                            className="w-full px-3 py-2 text-xs border border-emerald-300 focus:ring-2 focus:ring-emerald-500/20 rounded-lg text-gray-900 font-mono font-bold"
                            placeholder="e.g. company@okhdfcbank"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                                Beneficiary Name
                            </label>
                            <input
                                type="text"
                                value={content.accountHolderName || ''}
                                onChange={(e) => updateContent({ accountHolderName: e.target.value })}
                                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg text-gray-800"
                                placeholder="Acme Technologies Pvt Ltd"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                                UPI App / Bank
                            </label>
                            <input
                                type="text"
                                value={content.bankName || ''}
                                onChange={(e) => updateContent({ bankName: e.target.value })}
                                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg text-gray-800"
                                placeholder="HDFC Bank UPI / GPay"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                            Pre-filled Amount (Optional)
                        </label>
                        <input
                            type="text"
                            value={content.amountText || ''}
                            onChange={(e) => updateContent({ amountText: e.target.value })}
                            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg text-gray-800"
                            placeholder="e.g. ₹25,000.00"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                            UPI Transfer Instructions
                        </label>
                        <textarea
                            rows={2}
                            value={content.additionalInstructions || ''}
                            onChange={(e) => updateContent({ additionalInstructions: e.target.value })}
                            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none"
                            placeholder="Scan with any UPI app (GPay, PhonePe, Paytm) or transfer directly to this UPI ID."
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
