'use client';

import React, { useState } from 'react';
import { 
    CreditCard, 
    ExternalLink, 
    Copy, 
    Check, 
    Building2, 
    Sparkles, 
    ShieldCheck, 
    Calendar, 
    Percent, 
    DollarSign,
    QrCode,
    ArrowUpRight,
    Lock,
    Plus,
    Trash2,
    Link2,
    Zap,
    Smartphone
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { updateBlock, Block } from '@/redux/slices/documentSlice';

interface PaymentCheckoutBlockProps {
    block: Block;
    isSelected?: boolean;
    isPublicViewer?: boolean;
}

export function PaymentCheckoutBlock({ block, isSelected, isPublicViewer = false }: PaymentCheckoutBlockProps) {
    const dispatch = useDispatch();
    const content = block.content || {};
    const mode = content.mode || 'button';
    const [copiedField, setCopiedField] = useState<string | null>(null);

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

    const handleCopy = (text: string, label: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(label);
        toast.success(`Copied ${label} to clipboard!`, { id: `copy-${label}`, duration: 1500 });
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleButtonClick = (e: React.MouseEvent) => {
        if (!isPublicViewer) {
            if (content.paymentUrl) {
                window.open(content.paymentUrl, '_blank', 'noopener,noreferrer');
            } else {
                toast('Please enter a Payment URL below', { icon: 'ℹ️' });
            }
            return;
        }
        if (content.paymentUrl) {
            window.open(content.paymentUrl, '_blank', 'noopener,noreferrer');
        }
    };

    // ─────────────────────────────────────────────────────────────────────────────
    // MODE 1: PAYMENT BUTTON / DIRECT CHECKOUT LINK
    // ─────────────────────────────────────────────────────────────────────────────
    if (mode === 'button') {
        const gateway = content.gateway || 'razorpay';
        const buttonStyle = content.buttonStyle || 'gradient';
        const alignment = content.buttonAlignment || 'center';
        const buttonColor = content.buttonColor || '#4f46e5';
        const buttonText = content.buttonText || 'Pay via Secure Gateway';
        const amountText = content.amountText || '';
        const paymentUrl = content.paymentUrl || 'https://razorpay.me/@yourcompany';

        const alignClass = {
            left: 'justify-start items-start text-left',
            center: 'justify-center items-center text-center',
            right: 'justify-end items-end text-right',
            full: 'w-full'
        }[alignment as 'left' | 'center' | 'right' | 'full'] || 'justify-center items-center text-center';

        const getGatewayBadge = () => {
            switch (gateway) {
                case 'razorpay':
                    return { label: 'Razorpay Verified', color: 'bg-blue-50 text-blue-700 border-blue-200' };
                case 'stripe':
                    return { label: 'Stripe Checkout', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
                case 'paypal':
                    return { label: 'PayPal Secure', color: 'bg-sky-50 text-sky-700 border-sky-200' };
                case 'upi':
                    return { label: 'Instant UPI / QR', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
                default:
                    return { label: 'Secure Checkout', color: 'bg-purple-50 text-purple-700 border-purple-200' };
            }
        };

        const badge = getGatewayBadge();

        return (
            <div className={clsx("w-full py-4 flex flex-col gap-3", alignClass)}>
                {/* Header Tag Bar */}
                <div className="flex items-center gap-2 flex-wrap">
                    {!isPublicViewer ? (
                        <select
                            value={gateway}
                            onChange={(e) => updateContent({ gateway: e.target.value })}
                            className={clsx(
                                "text-[11px] font-semibold px-2.5 py-0.5 rounded-full border cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white",
                                badge.color
                            )}
                        >
                            <option value="razorpay">🔒 Razorpay Verified</option>
                            <option value="stripe">💳 Stripe Checkout</option>
                            <option value="paypal">🅿️ PayPal Secure</option>
                            <option value="upi">⚡ Instant UPI / QR</option>
                            <option value="custom">🌐 Custom Gateway</option>
                        </select>
                    ) : (
                        <span className={clsx("text-[11px] font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 shadow-2xs", badge.color)}>
                            <Lock className="w-3 h-3" />
                            {badge.label}
                        </span>
                    )}

                    {!isPublicViewer ? (
                        <input
                            type="text"
                            value={amountText}
                            onChange={(e) => updateContent({ amountText: e.target.value })}
                            placeholder="Amount (e.g. ₹15,000.00)"
                            className="text-xs font-bold text-gray-700 bg-gray-50 hover:bg-white focus:bg-white px-2.5 py-0.5 rounded-full border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-28 text-center"
                        />
                    ) : (
                        amountText && (
                            <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2.5 py-0.5 rounded-full border border-gray-200">
                                {amountText}
                            </span>
                        )
                    )}
                </div>

                {/* The Interactive CTA Button */}
                <div className={clsx("flex", alignment === 'full' ? 'w-full' : alignClass)}>
                    <div
                        style={{
                            backgroundColor: buttonStyle === 'solid' || buttonStyle === 'pill' ? buttonColor : undefined,
                            borderColor: buttonStyle === 'outline' ? buttonColor : undefined,
                            color: buttonStyle === 'outline' ? buttonColor : '#ffffff',
                        }}
                        className={clsx(
                            "group relative flex items-center justify-center gap-2.5 px-7 py-3 text-sm font-bold shadow-md transition-all duration-200",
                            alignment === 'full' ? 'w-full' : '',
                            buttonStyle === 'pill' ? 'rounded-full' : 'rounded-xl',
                            buttonStyle === 'gradient' && "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white shadow-indigo-500/25 hover:shadow-lg",
                            buttonStyle === 'solid' && "hover:opacity-90 shadow-gray-400/20",
                            buttonStyle === 'outline' && "bg-transparent border-2 hover:bg-gray-50"
                        )}
                    >
                        <CreditCard className="w-4 h-4 flex-shrink-0" />
                        
                        {!isPublicViewer ? (
                            <input
                                type="text"
                                value={buttonText}
                                onChange={(e) => updateContent({ buttonText: e.target.value })}
                                className="bg-transparent text-inherit font-bold text-sm focus:outline-none text-center min-w-[140px] px-1 border-b border-white/30 focus:border-white"
                                placeholder="Button Label..."
                            />
                        ) : (
                            <button
                                type="button"
                                onClick={handleButtonClick}
                                className="bg-transparent border-0 text-inherit font-bold text-sm cursor-pointer p-0"
                            >
                                {buttonText}
                            </button>
                        )}

                        <button 
                            type="button"
                            onClick={handleButtonClick}
                            title="Launch link in new window"
                            className="p-1 hover:bg-white/20 rounded-md transition-colors cursor-pointer"
                        >
                            <ArrowUpRight className="w-4 h-4 opacity-75 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </button>
                    </div>
                </div>

                {/* Direct Link Input / Display */}
                {!isPublicViewer ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 bg-gray-50 px-3 py-1 rounded-lg border border-gray-200/80 max-w-full">
                        <Link2 className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                        <span className="font-semibold text-gray-600">Payment URL:</span>
                        <input
                            type="url"
                            value={paymentUrl}
                            onChange={(e) => updateContent({ paymentUrl: e.target.value })}
                            placeholder="https://razorpay.me/@yourcompany"
                            className="bg-transparent border-0 text-indigo-600 underline font-medium focus:outline-none w-64 text-[11px] truncate"
                        />
                    </div>
                ) : (
                    paymentUrl && (
                        <p className="text-[11px] text-gray-400 flex items-center gap-1">
                            <span>Direct Link:</span>
                            <a href={paymentUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline truncate max-w-[280px]">
                                {paymentUrl}
                            </a>
                        </p>
                    )
                )}
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // MODE 2: MILESTONE SCHEDULE & PAYMENT BREAKDOWN
    // ─────────────────────────────────────────────────────────────────────────────
    if (mode === 'milestones') {
        const milestones = content.milestones || [];
        const milestoneTitle = content.milestoneTitle || 'Project Payment Milestones';
        const currency = content.milestoneCurrency || 'INR';

        const currencySymbol = {
            INR: '₹',
            USD: '$',
            EUR: '€',
            GBP: '£'
        }[currency] || '₹';

        const totalPercentage = milestones.reduce((sum: number, m: any) => sum + (Number(m.percentage) || 0), 0);
        const totalAmount = milestones.reduce((sum: number, m: any) => sum + (Number(m.amount) || 0), 0);

        const handleAddRow = () => {
            const newM = {
                id: 'm-' + Date.now(),
                title: `Phase ${milestones.length + 1}: Deliverable Specification`,
                percentage: 20,
                amount: 3000,
                dueDate: 'Net 30 Days',
                status: 'pending'
            };
            updateContent({ milestones: [...milestones, newM] });
        };

        const handleUpdateRow = (idx: number, patch: any) => {
            const updated = [...milestones];
            updated[idx] = { ...updated[idx], ...patch };
            updateContent({ milestones: updated });
        };

        const handleDeleteRow = (idx: number) => {
            const updated = milestones.filter((_: any, i: number) => i !== idx);
            updateContent({ milestones: updated });
        };

        return (
            <div className="w-full bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
                {/* Milestone Header */}
                <div className="px-5 py-4 bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold flex-shrink-0">
                            <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                            {!isPublicViewer ? (
                                <input
                                    type="text"
                                    value={milestoneTitle}
                                    onChange={(e) => updateContent({ milestoneTitle: e.target.value })}
                                    className="text-sm font-bold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none px-0.5"
                                    placeholder="Milestone Schedule Title..."
                                />
                            ) : (
                                <h4 className="text-sm font-bold text-gray-900">{milestoneTitle}</h4>
                            )}
                            <p className="text-[11px] text-gray-500">Staged payment installments linked to project deliverables</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className={clsx(
                            "text-xs font-semibold px-2.5 py-1 rounded-full border",
                            totalPercentage === 100 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                : "bg-amber-50 text-amber-700 border-amber-200"
                        )}>
                            {totalPercentage}% Allocated
                        </span>
                        <span className="text-xs font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                            Total: {currencySymbol}{totalAmount.toLocaleString()}
                        </span>
                        {!isPublicViewer && (
                            <button
                                type="button"
                                onClick={handleAddRow}
                                className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer border border-indigo-200"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add Phase
                            </button>
                        )}
                    </div>
                </div>

                {/* Milestone Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/70 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
                                <th className="px-4 py-3">Phase & Deliverable</th>
                                <th className="px-4 py-3 text-center">Installment</th>
                                <th className="px-4 py-3 text-right">Amount</th>
                                <th className="px-4 py-3">Due Timing</th>
                                <th className="px-4 py-3 text-center">Status</th>
                                {!isPublicViewer && <th className="px-2 py-3 w-8"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-700">
                            {milestones.map((m: any, idx: number) => {
                                const status = m.status || 'pending';
                                const statusConfig = {
                                    paid: { label: 'Paid', bg: 'bg-emerald-100 text-emerald-800' },
                                    overdue: { label: 'Overdue', bg: 'bg-rose-100 text-rose-800' },
                                    pending: { label: 'Pending', bg: 'bg-gray-100 text-gray-700' }
                                }[status as 'paid' | 'overdue' | 'pending'] || { label: 'Pending', bg: 'bg-gray-100 text-gray-700' };

                                return (
                                    <tr key={m.id || idx} className="hover:bg-indigo-50/30 transition-colors group/row">
                                        <td className="px-4 py-3 font-medium text-gray-900">
                                            <div className="flex items-center gap-2">
                                                <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                                    {idx + 1}
                                                </span>
                                                {!isPublicViewer ? (
                                                    <input
                                                        type="text"
                                                        value={m.title || ''}
                                                        onChange={(e) => handleUpdateRow(idx, { title: e.target.value })}
                                                        placeholder="Milestone description..."
                                                        className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none px-1 text-xs text-gray-900 font-medium"
                                                    />
                                                ) : (
                                                    <span>{m.title || `Milestone ${idx + 1}`}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center font-bold text-indigo-600">
                                            {!isPublicViewer ? (
                                                <div className="flex items-center justify-center gap-0.5">
                                                    <input
                                                        type="number"
                                                        value={m.percentage || 0}
                                                        onChange={(e) => handleUpdateRow(idx, { percentage: Number(e.target.value) })}
                                                        className="w-12 text-center bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none font-bold text-indigo-600"
                                                    />
                                                    <span>%</span>
                                                </div>
                                            ) : (
                                                `${m.percentage}%`
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-gray-900">
                                            {!isPublicViewer ? (
                                                <div className="flex items-center justify-end gap-0.5">
                                                    <span className="text-gray-400">{currencySymbol}</span>
                                                    <input
                                                        type="number"
                                                        value={m.amount || 0}
                                                        onChange={(e) => handleUpdateRow(idx, { amount: Number(e.target.value) })}
                                                        className="w-20 text-right bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none font-bold text-gray-900"
                                                    />
                                                </div>
                                            ) : (
                                                `${currencySymbol}${(Number(m.amount) || 0).toLocaleString()}`
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 font-medium">
                                            {!isPublicViewer ? (
                                                <input
                                                    type="text"
                                                    value={m.dueDate || ''}
                                                    onChange={(e) => handleUpdateRow(idx, { dueDate: e.target.value })}
                                                    placeholder="Due timing..."
                                                    className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none px-1 text-xs text-gray-600"
                                                />
                                            ) : (
                                                m.dueDate || 'Upon milestone sign-off'
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {!isPublicViewer ? (
                                                <select
                                                    value={m.status || 'pending'}
                                                    onChange={(e) => handleUpdateRow(idx, { status: e.target.value })}
                                                    className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none", statusConfig.bg)}
                                                >
                                                    <option value="pending">Pending</option>
                                                    <option value="paid">Paid</option>
                                                    <option value="overdue">Overdue</option>
                                                </select>
                                            ) : (
                                                <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full", statusConfig.bg)}>
                                                    {statusConfig.label}
                                                </span>
                                            )}
                                        </td>
                                        {!isPublicViewer && (
                                            <td className="px-2 py-3 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteRow(idx)}
                                                    className="text-gray-300 hover:text-rose-600 opacity-0 group-hover/row:opacity-100 transition-opacity p-1 cursor-pointer"
                                                    title="Delete row"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // MODE 4: UPI / INSTANT PAY TRANSFER (LIGHT SAAS THEME)
    // ─────────────────────────────────────────────────────────────────────────────
    if (mode === 'upi_transfer' || mode === 'upi') {
        const title = content.upiDetailsTitle || content.bankDetailsTitle || 'Instant UPI & QR Transfer';
        const upiId = content.upiId || 'company@okhdfcbank';
        const accountHolder = content.accountHolderName || 'Acme Technologies Pvt Ltd';
        const bankName = content.bankName || 'HDFC Bank UPI';
        const amount = content.amountText || '';
        const instructions = content.additionalInstructions || 'Scan with any UPI app (GPay, PhonePe, Paytm) or copy UPI ID to transfer.';

        const upiPayDeepLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(accountHolder)}${amount ? `&am=${encodeURIComponent(amount.replace(/[^0-9.]/g, ''))}` : ''}&cu=INR`;

        return (
            <div className="w-full bg-white rounded-2xl border border-gray-200/90 p-5 md:p-6 shadow-xs relative overflow-hidden transition-all">
                {/* Top Header */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 flex-wrap gap-2">
                    <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 flex-shrink-0 shadow-2xs">
                            <Zap className="w-5 h-5 fill-emerald-500/20" />
                        </div>
                        <div className="flex-1 min-w-0">
                            {!isPublicViewer ? (
                                <div className="space-y-0.5">
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => updateContent({ upiDetailsTitle: e.target.value })}
                                        className="text-sm font-bold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-emerald-500 focus:outline-none w-full"
                                        placeholder="UPI Transfer Title..."
                                    />
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                        <input
                                            type="text"
                                            value={accountHolder}
                                            onChange={(e) => updateContent({ accountHolderName: e.target.value })}
                                            className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-emerald-500 focus:outline-none flex-1 text-gray-700 font-medium"
                                            placeholder="Beneficiary Name"
                                        />
                                        <span>&bull;</span>
                                        <input
                                            type="text"
                                            value={bankName}
                                            onChange={(e) => updateContent({ bankName: e.target.value })}
                                            className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-emerald-500 focus:outline-none w-28 text-gray-500"
                                            placeholder="UPI Provider/Bank"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                                        {title}
                                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                    </h4>
                                    <p className="text-xs text-gray-500">{accountHolder} &bull; {bankName}</p>
                                </>
                            )}
                        </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/80 flex items-center gap-1">
                        <Smartphone className="w-3 h-3" /> Instant UPI
                    </span>
                </div>

                {/* Primary UPI ID Tile */}
                <div className="my-4 p-4 bg-emerald-50/40 rounded-xl border border-emerald-100 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex-1 min-w-[200px]">
                        <span className="text-[10px] text-emerald-800 uppercase font-bold tracking-wider">UPI ID / VPA Handle</span>
                        {!isPublicViewer ? (
                            <input
                                type="text"
                                value={upiId}
                                onChange={(e) => updateContent({ upiId: e.target.value })}
                                className="text-base font-mono font-extrabold text-emerald-700 mt-0.5 bg-transparent border-b border-transparent hover:border-emerald-300 focus:border-emerald-500 focus:outline-none w-full"
                                placeholder="e.g. company@okhdfcbank"
                            />
                        ) : (
                            <p className="text-base font-mono font-extrabold text-emerald-700 mt-0.5 tracking-wide">{upiId}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => handleCopy(upiId, 'UPI ID')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-2xs"
                        >
                            {copiedField === 'UPI ID' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedField === 'UPI ID' ? 'Copied' : 'Copy UPI ID'}</span>
                        </button>
                        {isPublicViewer && (
                            <a
                                href={upiPayDeepLink}
                                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
                            >
                                <ArrowUpRight className="w-3.5 h-3.5" />
                                <span>Pay via UPI App</span>
                            </a>
                        )}
                    </div>
                </div>

                {/* UPI Instructions / Note */}
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/80 text-[11px] text-gray-600 flex items-start gap-2">
                    <span className="text-emerald-700 font-bold mt-0.5">Instructions:</span>
                    {!isPublicViewer ? (
                        <input
                            type="text"
                            value={instructions}
                            onChange={(e) => updateContent({ additionalInstructions: e.target.value })}
                            className="flex-1 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-emerald-500 focus:outline-none text-gray-700 text-[11px]"
                            placeholder="UPI Payment instructions or transaction remarks..."
                        />
                    ) : (
                        <span>{instructions}</span>
                    )}
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // MODE 3: DIRECT BANK & WIRE TRANSFER (LIGHT SAAS THEME)
    // ─────────────────────────────────────────────────────────────────────────────
    const title = content.bankDetailsTitle || 'Direct Bank & Wire Transfer Details';
    const accountHolder = content.accountHolderName || 'Acme Technologies Pvt Ltd';
    const bankName = content.bankName || 'HDFC Bank';
    const accountNumber = content.accountNumber || '50200012345678';
    const ifscOrSwift = content.ifscOrSwiftCode || 'HDFC0001234';
    const iban = content.iban || '';
    const instructions = content.additionalInstructions || 'Please include your invoice reference number in the bank wire transaction remarks.';

    return (
        <div className="w-full bg-white rounded-2xl border border-gray-200/90 p-5 md:p-6 shadow-xs relative overflow-hidden transition-all">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 flex-wrap gap-2">
                <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0 shadow-2xs">
                        <Building2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        {!isPublicViewer ? (
                            <div className="space-y-0.5">
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => updateContent({ bankDetailsTitle: e.target.value })}
                                    className="text-sm font-bold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none w-full"
                                    placeholder="Bank Details Title..."
                                />
                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                    <input
                                        type="text"
                                        value={bankName}
                                        onChange={(e) => updateContent({ bankName: e.target.value })}
                                        className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none w-28 text-gray-700 font-medium"
                                        placeholder="Bank Name"
                                    />
                                    <span>&bull;</span>
                                    <input
                                        type="text"
                                        value={accountHolder}
                                        onChange={(e) => updateContent({ accountHolderName: e.target.value })}
                                        className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none flex-1 text-gray-700 font-medium"
                                        placeholder="Account Beneficiary"
                                    />
                                </div>
                            </div>
                        ) : (
                            <>
                                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                                    {title}
                                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                </h4>
                                <p className="text-xs text-gray-500">{bankName} &bull; {accountHolder}</p>
                            </>
                        )}
                    </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200/80">
                    Verified Wire Account
                </span>
            </div>

            {/* Grid of Bank Details (Clean Light Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-4">
                {/* Account Number */}
                <div className="p-3.5 bg-gray-50 hover:bg-slate-50/80 rounded-xl border border-gray-200/80 flex items-center justify-between transition-colors">
                    <div className="flex-1 mr-2 min-w-0">
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Account Number</span>
                        {!isPublicViewer ? (
                            <input
                                type="text"
                                value={accountNumber}
                                onChange={(e) => updateContent({ accountNumber: e.target.value })}
                                className="text-sm font-mono font-bold text-gray-900 mt-0.5 tracking-wider bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none w-full"
                                placeholder="Account Number..."
                            />
                        ) : (
                            <p className="text-sm font-mono font-bold text-gray-900 mt-0.5 tracking-wider truncate">{accountNumber}</p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => handleCopy(accountNumber, 'Account Number')}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="Copy Account Number"
                    >
                        {copiedField === 'Account Number' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                </div>

                {/* IFSC / SWIFT Code */}
                <div className="p-3.5 bg-gray-50 hover:bg-slate-50/80 rounded-xl border border-gray-200/80 flex items-center justify-between transition-colors">
                    <div className="flex-1 mr-2 min-w-0">
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">IFSC / SWIFT Code</span>
                        {!isPublicViewer ? (
                            <input
                                type="text"
                                value={ifscOrSwift}
                                onChange={(e) => updateContent({ ifscOrSwiftCode: e.target.value.toUpperCase() })}
                                className="text-sm font-mono font-bold text-indigo-700 mt-0.5 tracking-wider bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none w-full uppercase"
                                placeholder="IFSC/SWIFT..."
                            />
                        ) : (
                            <p className="text-sm font-mono font-bold text-indigo-700 mt-0.5 tracking-wider">{ifscOrSwift}</p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => handleCopy(ifscOrSwift, 'IFSC / SWIFT')}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="Copy IFSC/SWIFT"
                    >
                        {copiedField === 'IFSC / SWIFT' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                </div>

                {/* Beneficiary Name */}
                <div className="p-3.5 bg-gray-50 hover:bg-slate-50/80 rounded-xl border border-gray-200/80 flex items-center justify-between transition-colors">
                    <div className="flex-1 mr-2 min-w-0">
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Account Beneficiary</span>
                        {!isPublicViewer ? (
                            <input
                                type="text"
                                value={accountHolder}
                                onChange={(e) => updateContent({ accountHolderName: e.target.value })}
                                className="text-sm font-medium text-gray-900 mt-0.5 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none w-full"
                                placeholder="Beneficiary Name..."
                            />
                        ) : (
                            <p className="text-sm font-medium text-gray-900 mt-0.5 truncate">{accountHolder}</p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => handleCopy(accountHolder, 'Beneficiary Name')}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="Copy Beneficiary Name"
                    >
                        {copiedField === 'Beneficiary Name' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                </div>

                {/* IBAN (International Wire) */}
                <div className="p-3.5 bg-gray-50 hover:bg-slate-50/80 rounded-xl border border-gray-200/80 flex items-center justify-between transition-colors">
                    <div className="flex-1 mr-2 min-w-0">
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">IBAN (International Wire)</span>
                        {!isPublicViewer ? (
                            <input
                                type="text"
                                value={iban}
                                onChange={(e) => updateContent({ iban: e.target.value.toUpperCase() })}
                                className="text-sm font-mono font-bold text-gray-700 mt-0.5 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none w-full uppercase"
                                placeholder="IBAN (Optional)..."
                            />
                        ) : (
                            <p className="text-sm font-mono font-bold text-gray-700 mt-0.5">{iban || 'N/A'}</p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => handleCopy(iban, 'IBAN')}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="Copy IBAN"
                    >
                        {copiedField === 'IBAN' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Wire Reference Instructions */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/80 text-[11px] text-gray-600 flex items-start gap-2">
                <span className="text-indigo-600 font-bold mt-0.5">Note:</span>
                {!isPublicViewer ? (
                    <input
                        type="text"
                        value={instructions}
                        onChange={(e) => updateContent({ additionalInstructions: e.target.value })}
                        className="flex-1 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none text-gray-700 text-[11px]"
                        placeholder="Wire transfer remarks or document reference instructions..."
                    />
                ) : (
                    <span>{instructions}</span>
                )}
            </div>
        </div>
    );
}
