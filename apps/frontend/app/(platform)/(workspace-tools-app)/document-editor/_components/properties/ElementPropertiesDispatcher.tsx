'use client';

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/redux/store';
import { selectBlock, updateBlock } from '@/redux/slices/documentSlice';
import { MousePointerClick, Sliders, Trash2, Copy, Sparkles, Layers } from 'lucide-react';
import { TextProperties } from './TextProperties';
import { BoxProperties } from './BoxProperties';
import { ContainerProperties } from './ContainerProperties';
import { PricingTableProperties } from './PricingTableProperties';
import { SignatureProperties } from './SignatureProperties';
import { ApprovalButtonProperties } from './ApprovalButtonProperties';
import { ImageProperties } from './ImageProperties';
import { ListProperties } from './ListProperties';
import { GridProperties } from './GridProperties';
import { DividerProperties } from './DividerProperties';
import { PaymentCheckoutProperties } from './PaymentCheckoutProperties';

export function ElementPropertiesDispatcher() {
    const dispatch = useDispatch();
    const { blocks, headerBlocks, footerBlocks, selectedBlockId } = useSelector((state: any) => state.document);

    // Recursively find selected block (including inside containers)
    const findBlockById = (list: any[], id: string): any => {
        for (const b of list || []) {
            if (b.id === id) return b;
            if (b.content?.children && Array.isArray(b.content.children)) {
                const found = findBlockById(b.content.children, id);
                if (found) return found;
            }
        }
        return null;
    };

    const allBlocks = [...(blocks || []), ...(headerBlocks || []), ...(footerBlocks || [])];
    const selectedBlock = selectedBlockId ? findBlockById(allBlocks, selectedBlockId) : null;

    if (!selectedBlock) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center h-full min-h-[300px] text-gray-400">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mb-3 border border-indigo-100/80 shadow-2xs">
                    <MousePointerClick className="w-6 h-6 animate-pulse" />
                </div>
                <h4 className="text-xs font-bold text-gray-700 mb-1">No Element Selected</h4>
                <p className="text-[11px] text-gray-400 max-w-[200px] leading-relaxed">
                    Click any block on the canvas to customize its typography, layout, or dynamic data properties.
                </p>
            </div>
        );
    }

    const type = selectedBlock.type?.toLowerCase();

    // Render corresponding modular property component
    switch (type) {
        case 'text':
        case 'heading':
            return <TextProperties block={selectedBlock} />;
        case 'box':
            return <BoxProperties block={selectedBlock} />;
        case 'container':
        case 'row':
        case 'column':
            return <ContainerProperties block={selectedBlock} />;
        case 'pricing_table':
        case 'pricing':
            return <PricingTableProperties block={selectedBlock} />;
        case 'payment_checkout':
        case 'payment':
        case 'checkout':
            return <PaymentCheckoutProperties block={selectedBlock} />;
        case 'signature':
            return <SignatureProperties block={selectedBlock} />;
        case 'approval_buttons':
        case 'decision':
            return <ApprovalButtonProperties block={selectedBlock} />;
        case 'image':
        case 'media':
            return <ImageProperties block={selectedBlock} />;
        case 'list':
            return <ListProperties block={selectedBlock} />;
        case 'grid':
            return <GridProperties block={selectedBlock} />;
        case 'line':
        case 'divider':
        case 'pagebreak':
            return <DividerProperties block={selectedBlock} />;
        default:
            return <TextProperties block={selectedBlock} />;
    }
}
