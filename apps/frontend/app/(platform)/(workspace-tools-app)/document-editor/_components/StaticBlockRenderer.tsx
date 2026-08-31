import React from 'react';
import clsx from 'clsx';
import { X, Copy } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { selectBlock, removeBlock, duplicateBlock, updateBlock, Block } from '@/redux/slices/documentSlice';
import dynamic from 'next/dynamic';
const TextBlock = dynamic(() => import('./blocks/TextBlock').then(mod => mod.TextBlock), { ssr: false });
import { LineBlock } from './blocks/LineBlock';
import { BoxBlock } from './blocks/BoxBlock';
import { ImageBlock } from './blocks/ImageBlock';
import { ListBlock } from './blocks/ListBlock';
import { GridBlock } from './blocks/GridBlock';
import { PricingTableBlock } from './blocks/PricingTableBlock';
import { SignatureBlock } from './blocks/SignatureBlock';
import { ApprovalButtonBlock } from './blocks/ApprovalButtonBlock';
import { ContainerBlock } from './blocks/ContainerBlock';
import { PaymentCheckoutBlock } from './blocks/PaymentCheckoutBlock';
import { EyeOff } from 'lucide-react';

interface StaticBlockRendererProps {
  block: Block;
}

export function StaticBlockRenderer({ block }: StaticBlockRendererProps) {
  const dispatch = useDispatch();
  const selectedBlockId = useSelector((state: any) => state.document?.selectedBlockId);
  const isSelected = selectedBlockId === block.id;
  const [localWidth, setLocalWidth] = React.useState<string | null>(null);
  const [localHeight, setLocalHeight] = React.useState<string | null>(null);

  const startResize = (direction: 'right' | 'left' | 'bottom' | 'bottom-right') => (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const node = e.currentTarget.parentElement;
    if (!node) return;
    
    const startPxWidth = node.getBoundingClientRect().width;
    const startPxHeight = node.getBoundingClientRect().height;
    const parentWidth = node.parentElement?.getBoundingClientRect().width || 1;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (direction === 'right' || direction === 'bottom-right') {
        const deltaX = moveEvent.clientX - startX;
        const newWidthPx = startPxWidth + deltaX;
        const newWidthPct = Math.max(10, Math.min(100, (newWidthPx / parentWidth) * 100));
        setLocalWidth(`${newWidthPct}%`);
      } else if (direction === 'left') {
        const deltaX = startX - moveEvent.clientX;
        const newWidthPx = startPxWidth + deltaX;
        const newWidthPct = Math.max(10, Math.min(100, (newWidthPx / parentWidth) * 100));
        setLocalWidth(`${newWidthPct}%`);
      }
      if (direction === 'bottom' || direction === 'bottom-right') {
        const deltaY = moveEvent.clientY - startY;
        const newHeightPx = Math.max(30, startPxHeight + deltaY);
        setLocalHeight(`${newHeightPx}px`);
      }
    };

    const onMouseUp = (upEvent: MouseEvent) => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      
      const updates: any = {};
      if (direction === 'right' || direction === 'bottom-right') {
        const finalDeltaX = upEvent.clientX - startX;
        const finalWidthPx = startPxWidth + finalDeltaX;
        const finalWidthPct = Math.max(10, Math.min(100, (finalWidthPx / parentWidth) * 100));
        updates.width = `${Math.round(finalWidthPct)}%`;
      } else if (direction === 'left') {
        const finalDeltaX = startX - upEvent.clientX;
        const finalWidthPx = startPxWidth + finalDeltaX;
        const finalWidthPct = Math.max(10, Math.min(100, (finalWidthPx / parentWidth) * 100));
        updates.width = `${Math.round(finalWidthPct)}%`;
      }
      if (direction === 'bottom' || direction === 'bottom-right') {
        const finalDeltaY = upEvent.clientY - startY;
        const finalHeightPx = Math.max(30, startPxHeight + finalDeltaY);
        updates.minHeight = `${Math.round(finalHeightPx)}px`;
      }
      
      setLocalWidth(null);
      setLocalHeight(null);
      dispatch(updateBlock({ id: block.id, updates: { styles: { ...block.styles, ...updates } } }));
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const getAlignmentStyle = () => {
    const align = block.styles?.alignment || 'left';
    if (align === 'center') return { margin: '0 auto' };
    if (align === 'right') return { marginLeft: 'auto' };
    return { marginRight: 'auto' };
  };

  const style = {
    width: localWidth || block.styles?.width || '100%',
    minHeight: localHeight || block.styles?.minHeight || 'auto',
    padding: block.styles?.padding || '0px',
    ...getAlignmentStyle(),
  };

  return (
    <div
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        dispatch(selectBlock(block.id));
      }}
      className={clsx(
        "relative cursor-pointer transition-all border-2 rounded-md group/block bg-white",
        isSelected 
          ? "border-[#2563eb] shadow-sm bg-blue-50/10" 
          : "border-transparent hover:border-gray-200"
      )}
    >
      {block.visibilityRule && (
        <div className="absolute top-2 right-2 bg-blue-100 text-blue-600 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 z-10 shadow-sm border border-blue-200">
          <EyeOff className="w-3 h-3" /> Rule Active
        </div>
      )}

      {/* Block Content Renderer */}
      <div className="p-4 w-full h-full">
        {(block.type === 'heading' || block.type === 'text') && <TextBlock block={block} isSelected={isSelected} />}
        {(block.type === 'divider' || block.type === 'line' || block.type === 'pagebreak') && <LineBlock block={block} isSelected={isSelected} />}
        {block.type === 'box' && <BoxBlock block={block} isSelected={isSelected} />}
        {block.type === 'container' && <ContainerBlock block={block as any} isSelected={isSelected} />}
        {block.type === 'image' && <ImageBlock block={block} isSelected={isSelected} />}
        {block.type === 'list' && <ListBlock block={block} isSelected={isSelected} />}
        {block.type === 'grid' && (block.content?.items ? <PricingTableBlock block={block} isSelected={isSelected} /> : <GridBlock block={block} isSelected={isSelected} />)}
        {block.type === 'pricing_table' && <PricingTableBlock block={block} isSelected={isSelected} />}
        {(block.type === 'payment_checkout' || block.type === 'payment' || block.type === 'checkout') && <PaymentCheckoutBlock block={block} isSelected={isSelected} />}
        {block.type === 'signature' && <SignatureBlock block={block} isSelected={isSelected} />}
        {(block.type === 'approval_buttons' || block.type === 'decision') && <ApprovalButtonBlock block={block} isSelected={isSelected} />}
      </div>

      {/* Action Buttons */}
      {isSelected && (
        <div className="absolute -top-3 -right-3 flex gap-1 z-10">
          <div 
            onClick={(e) => {
              e.stopPropagation();
              dispatch(duplicateBlock(block.id));
            }}
            className="w-6 h-6 bg-white border border-gray-200 rounded-full shadow-sm flex items-center justify-center cursor-pointer text-gray-400 hover:text-indigo-600 transition-colors"
            title="Duplicate Block"
          >
            <Copy className="w-3 h-3" />
          </div>
          <div 
            onClick={(e) => {
              e.stopPropagation();
              dispatch(removeBlock(block.id));
            }}
            className="w-6 h-6 bg-white border border-gray-200 rounded-full shadow-sm flex items-center justify-center cursor-pointer text-gray-400 hover:text-red-500 transition-colors"
            title="Remove Block"
          >
            <X className="w-3 h-3" />
          </div>
        </div>
      )}

      {/* Selection Border & Drag Adjuster Handles */}
      {isSelected && (
        <>
          {/* Right Edge Adjuster Pill */}
          <div 
            onMouseDown={startResize('right')}
            className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3.5 h-8 bg-indigo-600 rounded-full shadow-md cursor-col-resize z-20 hover:scale-125 transition-transform"
            title="Drag to resize width"
          />

          {/* Left Edge Adjuster Pill */}
          <div 
            onMouseDown={startResize('left')}
            className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3.5 h-8 bg-indigo-600 rounded-full shadow-md cursor-col-resize z-20 hover:scale-125 transition-transform"
            title="Drag to resize width"
          />

          {/* Bottom Edge Adjuster Pill */}
          <div 
            onMouseDown={startResize('bottom')}
            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-8 h-3.5 bg-indigo-600 rounded-full shadow-md cursor-row-resize z-20 hover:scale-125 transition-transform"
            title="Drag to adjust height"
          />

          {/* Corner Dots */}
          <div 
            onMouseDown={startResize('bottom-right')}
            className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-indigo-600 border-2 border-white rounded-full shadow-sm cursor-nwse-resize z-20 hover:scale-125 transition-transform"
            title="Drag to resize"
          />
          <div className="absolute -top-1.5 -left-1.5 w-2.5 h-2.5 bg-indigo-600 border-2 border-white rounded-full shadow-xs z-10 pointer-events-none" />
          <div className="absolute -bottom-1.5 -left-1.5 w-2.5 h-2.5 bg-indigo-600 border-2 border-white rounded-full shadow-xs z-10 pointer-events-none" />
        </>
      )}
    </div>
  );
}
