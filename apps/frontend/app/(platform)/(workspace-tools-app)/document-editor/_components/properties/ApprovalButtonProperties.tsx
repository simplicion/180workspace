'use client';

import React from 'react';
import { useDispatch } from 'react-redux';
import { updateBlock, Block } from '@/redux/slices/documentSlice';
import { Check, XCircle, Shield, MessageSquare } from 'lucide-react';
import clsx from 'clsx';

interface ApprovalButtonPropertiesProps {
    block: Block;
}

export function ApprovalButtonProperties({ block }: ApprovalButtonPropertiesProps) {
    const dispatch = useDispatch();
    const content = block.content || {};

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

    return (
        <div className="p-4 space-y-5 text-xs text-gray-700">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <span className="font-bold text-gray-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-indigo-600" />
                    Approval Action Buttons
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold uppercase">
                    Decision
                </span>
            </div>

            {/* Title / Section Banner */}
            <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-700">Action Section Title</label>
                <input
                    type="text"
                    value={content.title || 'Client Authorization & Review'}
                    onChange={(e) => handleContentChange('title', e.target.value)}
                    placeholder="e.g. Agreement Approval"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-medium"
                />
            </div>

            {/* Accept Button Label */}
            <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-600" /> Accept Button Text
                </label>
                <input
                    type="text"
                    value={content.acceptLabel || 'Approve & Accept Terms'}
                    onChange={(e) => handleContentChange('acceptLabel', e.target.value)}
                    placeholder="e.g. Approve & Proceed"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-medium"
                />
            </div>

            {/* Decline Button Label */}
            <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-rose-700 flex items-center gap-1">
                    <XCircle className="w-3 h-3 text-rose-600" /> Decline / Revision Button Text
                </label>
                <input
                    type="text"
                    value={content.declineLabel || 'Request Revisions'}
                    onChange={(e) => handleContentChange('declineLabel', e.target.value)}
                    placeholder="e.g. Request Changes"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-medium"
                />
            </div>

            {/* Require Reason on Decline */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                    <span className="text-[11px] font-bold text-gray-800 block">Mandatory Reason on Decline</span>
                    <span className="text-[10px] text-gray-400">Forces reviewer to specify revision notes</span>
                </div>
                <input
                    type="checkbox"
                    checked={content.requireReason !== false}
                    onChange={(e) => handleContentChange('requireReason', e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                />
            </div>
        </div>
    );
}
