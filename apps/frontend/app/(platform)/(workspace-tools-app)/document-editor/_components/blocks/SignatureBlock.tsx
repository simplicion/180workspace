'use client';

import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { updateBlock, Block } from '@/redux/slices/documentSlice';
import { PenTool, Trash2, Edit3, ShieldCheck, Check, Sparkles } from 'lucide-react';
import { UniversalSignatureModal } from '../UniversalSignatureModal';
import clsx from 'clsx';

interface SignatureBlockProps {
  block: Block;
  isSelected?: boolean;
  isPublicViewer?: boolean;
}

export function SignatureBlock({ block, isSelected, isPublicViewer = false }: SignatureBlockProps) {
  const dispatch = useDispatch();
  const content = block.content || {};
  const styles = block.styles || {};
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);

  const label = content.label || 'Authorized Signatory';
  const requireName = content.requireName !== false;
  const signatoryName = content.signatoryName || '';
  const signatureImage = content.signatureImage || null;
  const signedAt = content.signedAt || null;
  const alignment = content.alignment || styles.textAlign || 'left';
  const slotWidth = content.width || styles.width || '280px';

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

  const handleSaveSignature = (data: { signatureImage: string; signerName?: string; signedAt?: string }) => {
    updateContent({
      signatureImage: data.signatureImage,
      ...(data.signerName ? { signatoryName: data.signerName } : {}),
      ...(data.signedAt ? { signedAt: data.signedAt } : {})
    });
  };

  const handleClearSignature = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateContent({
      signatureImage: null,
      signedAt: null
    });
  };

  const alignClass = {
    left: 'items-start text-left justify-start',
    center: 'items-center text-center justify-center',
    right: 'items-end text-right justify-end'
  }[alignment as 'left' | 'center' | 'right'] || 'items-start text-left justify-start';

  return (
    <div className={clsx("w-full flex py-2", alignClass)}>
      {/* Universal Big Screen Signature Modal */}
      <UniversalSignatureModal
        isOpen={isSignModalOpen}
        onClose={() => setIsSignModalOpen(false)}
        onSaveSignature={handleSaveSignature}
        initialSignerName={signatoryName}
        signatoryRole={label}
        initialSignatureImage={signatureImage}
        title={`Sign as ${label}`}
      />

      {/* Signature Element Box (Clean & Compact) */}
      <div 
        style={{ width: slotWidth === '100%' ? '100%' : typeof slotWidth === 'number' ? `${slotWidth}px` : slotWidth }}
        className="flex flex-col gap-2 group/sig relative"
      >
        {/* Interactive Signature Surface Line */}
        <div
          onClick={() => setIsSignModalOpen(true)}
          className={clsx(
            "h-24 rounded-xl border-2 border-dashed transition-all cursor-pointer relative flex items-center justify-center p-2 group",
            signatureImage 
              ? "bg-white/80 border-indigo-200 hover:border-indigo-400 hover:shadow-xs" 
              : "bg-slate-50/70 hover:bg-indigo-50/40 border-gray-300 hover:border-indigo-400"
          )}
          title="Click to sign or edit signature"
        >
          {signatureImage ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <img 
                src={signatureImage} 
                alt="Digital Signature" 
                className="max-h-20 max-w-full object-contain pointer-events-none"
              />

              {/* Hover Actions */}
              <div className="absolute inset-0 bg-black/40 backdrop-blur-2xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <span className="flex items-center gap-1 text-[11px] font-bold text-white bg-indigo-600 px-2.5 py-1 rounded-md shadow-xs">
                  <Edit3 className="w-3 h-3" /> Change
                </span>
                {!isPublicViewer && (
                  <button
                    type="button"
                    onClick={handleClearSignature}
                    className="p-1 text-white hover:text-rose-300 hover:bg-white/20 rounded-md transition-colors"
                    title="Remove Signature"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-400 group-hover:text-indigo-600 transition-colors gap-1">
              <div className="w-8 h-8 rounded-full bg-white border border-gray-200 group-hover:border-indigo-300 group-hover:bg-indigo-50 flex items-center justify-center transition-all shadow-2xs">
                <PenTool className="w-4 h-4 text-gray-500 group-hover:text-indigo-600" />
              </div>
              <span className="text-[11px] font-bold tracking-tight">Click to Sign</span>
            </div>
          )}

          {/* Baseline Indicator */}
          <div className="absolute bottom-2 left-4 right-4 border-b border-gray-300 pointer-events-none opacity-40" />
        </div>

        {/* Signatory Label / Role (Inline Editable on Canvas) */}
        <div>
          {!isPublicViewer ? (
            <input
              type="text"
              value={label}
              onChange={(e) => updateContent({ label: e.target.value })}
              placeholder="Signatory Label (e.g. Authorized Signatory)"
              className="w-full text-xs font-bold text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none px-0.5"
            />
          ) : (
            <p className="text-xs font-bold text-gray-800">{label}</p>
          )}
        </div>

        {/* Printed Name Line */}
        {requireName && (
          <div className="text-[11px] text-gray-600 flex items-center gap-1 pt-0.5">
            <span className="font-semibold text-gray-500">Name:</span>
            {!isPublicViewer ? (
              <input
                type="text"
                value={signatoryName}
                onChange={(e) => updateContent({ signatoryName: e.target.value })}
                placeholder="Full Name..."
                className="flex-1 bg-transparent border-b border-gray-200 hover:border-gray-300 focus:border-indigo-500 focus:outline-none text-[11px] text-gray-800 px-1"
              />
            ) : (
              <span className="font-medium text-gray-800">{signatoryName || '______________________'}</span>
            )}
          </div>
        )}

        {/* Date Line (if signed) */}
        {signedAt && (
          <div className="text-[10px] text-gray-400 flex items-center gap-1 font-mono">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>Signed: {new Date(signedAt).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
