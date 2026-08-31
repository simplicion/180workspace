'use client';

import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { updateBlock, Block } from '@/redux/slices/documentSlice';
import { FileBadge2, ShieldCheck, PenTool, Trash2, AlignLeft, AlignCenter, AlignRight, CheckCircle2 } from 'lucide-react';
import { UniversalSignatureModal } from '../UniversalSignatureModal';
import clsx from 'clsx';

interface SignaturePropertiesProps {
    block: Block;
}

export function SignatureProperties({ block }: SignaturePropertiesProps) {
    const dispatch = useDispatch();
    const content = block.content || {};
    const styles = block.styles || {};
    const [isSignModalOpen, setIsSignModalOpen] = useState(false);

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

    const handleSaveSignature = (data: { signatureImage: string; signerName?: string; signedAt?: string }) => {
        dispatch(updateBlock({
            id: block.id,
            updates: {
                content: {
                    ...content,
                    signatureImage: data.signatureImage,
                    ...(data.signerName ? { signatoryName: data.signerName } : {}),
                    ...(data.signedAt ? { signedAt: data.signedAt } : {})
                }
            }
        }));
    };

    const handleClearSignature = () => {
        dispatch(updateBlock({
            id: block.id,
            updates: {
                content: {
                    ...content,
                    signatureImage: null,
                    signedAt: null
                }
            }
        }));
    };

    return (
        <div className="p-4 space-y-5 text-xs text-gray-700">
            {/* Universal Big Screen Signature Modal */}
            <UniversalSignatureModal
                isOpen={isSignModalOpen}
                onClose={() => setIsSignModalOpen(false)}
                onSaveSignature={handleSaveSignature}
                initialSignerName={content.signatoryName || ''}
                signatoryRole={content.label || 'Authorized Signatory'}
                initialSignatureImage={content.signatureImage || null}
                title={`Sign as ${content.label || 'Authorized Signatory'}`}
            />

            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <span className="font-bold text-gray-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <FileBadge2 className="w-3.5 h-3.5 text-indigo-600" />
                    E-Signature Slot
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-semibold uppercase">
                    Legal
                </span>
            </div>

            {/* Signature Status & Quick Action */}
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/80 space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-700">Signature Status</span>
                    {content.signatureImage ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Signed
                        </span>
                    ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            Awaiting Signature
                        </span>
                    )}
                </div>

                {content.signatureImage ? (
                    <div className="space-y-2">
                        <div className="bg-white p-2 rounded-lg border border-gray-200 flex items-center justify-center h-16">
                            <img src={content.signatureImage} alt="Signature" className="max-h-12 object-contain" />
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setIsSignModalOpen(true)}
                                className="flex-1 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer border border-indigo-100 flex items-center justify-center gap-1"
                            >
                                <PenTool className="w-3.5 h-3.5" /> Re-Sign
                            </button>
                            <button
                                type="button"
                                onClick={handleClearSignature}
                                className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer border border-rose-100"
                                title="Clear signature"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setIsSignModalOpen(true)}
                        className="w-full py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                        <PenTool className="w-3.5 h-3.5" />
                        <span>Draw / Adopt Signature</span>
                    </button>
                )}
            </div>

            {/* Signatory Label */}
            <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-700">Signatory Label / Role</label>
                <input
                    type="text"
                    value={content.label || 'Authorized Signatory'}
                    onChange={(e) => handleContentChange('label', e.target.value)}
                    placeholder="e.g. Authorized Signatory or Client Lead"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-medium"
                />
            </div>

            {/* Require Printed Name */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                    <span className="text-[11px] font-bold text-gray-800 block">Require Full Legal Name</span>
                    <span className="text-[10px] text-gray-400">Include printed legal name line</span>
                </div>
                <input
                    type="checkbox"
                    checked={content.requireName !== false}
                    onChange={(e) => handleContentChange('requireName', e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                />
            </div>

            {/* Slot Width */}
            <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-700">Slot Width</label>
                <div className="grid grid-cols-4 gap-1 p-1 bg-gray-100 rounded-xl text-center font-medium">
                    {[
                        { label: 'Compact', value: '260px' },
                        { label: 'Standard', value: '340px' },
                        { label: '50%', value: '50%' },
                        { label: 'Full', value: '100%' },
                    ].map((w) => (
                        <button
                            key={w.value}
                            type="button"
                            onClick={() => handleContentChange('width', w.value)}
                            className={clsx(
                                "py-1.5 rounded-lg text-[10px] transition-all cursor-pointer",
                                (content.width || '260px') === w.value
                                    ? "bg-white text-indigo-600 font-bold shadow-2xs"
                                    : "text-gray-600 hover:text-gray-900"
                            )}
                        >
                            {w.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Slot Alignment */}
            <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-700">Slot Alignment</label>
                <div className="grid grid-cols-3 gap-1 p-1 bg-gray-100 rounded-xl text-center font-medium">
                    {[
                        { id: 'left', label: 'Left', icon: <AlignLeft className="w-3.5 h-3.5" /> },
                        { id: 'center', label: 'Center', icon: <AlignCenter className="w-3.5 h-3.5" /> },
                        { id: 'right', label: 'Right', icon: <AlignRight className="w-3.5 h-3.5" /> }
                    ].map((a) => (
                        <button
                            key={a.id}
                            type="button"
                            onClick={() => handleContentChange('alignment', a.id)}
                            className={clsx(
                                "py-1.5 rounded-lg text-xs transition-all flex items-center justify-center gap-1 cursor-pointer",
                                (content.alignment || 'left') === a.id
                                    ? "bg-white text-indigo-600 font-bold shadow-2xs"
                                    : "text-gray-600 hover:text-gray-900"
                            )}
                        >
                            {a.icon}
                            <span>{a.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Security Notice */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1 text-slate-600">
                <div className="flex items-center gap-1.5 font-bold text-[11px] text-slate-800">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    eIDAS & ESIGN Compliant
                </div>
                <p className="text-[10px] leading-relaxed">
                    Digital signatures executed in this slot capture timestamps, signer identity, and legal verification hashes.
                </p>
            </div>
        </div>
    );
}
