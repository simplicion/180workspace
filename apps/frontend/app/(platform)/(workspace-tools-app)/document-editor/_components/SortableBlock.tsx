import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import { X, GripVertical } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { selectBlock, removeBlock, updateBlock, duplicateBlock, Block } from '../../../../../redux/slices/documentSlice';
import dynamic from 'next/dynamic';
const TextBlock = dynamic(() => import('./blocks/TextBlock').then(mod => mod.TextBlock), { ssr: false });
import { HeadingBlock } from './blocks/HeadingBlock';
import { DividerBlock } from './blocks/DividerBlock';
import { BoxBlock } from './blocks/BoxBlock';
import { ImageBlock } from './blocks/ImageBlock';
import { ListBlock } from './blocks/ListBlock';
import { GridBlock } from './blocks/GridBlock';
import { SignatureBlock } from './blocks/SignatureBlock';
import { InputBlock } from './blocks/InputBlock';
import { PageBreakBlock } from './blocks/PageBreakBlock';
import { EyeOff, Copy } from 'lucide-react';

interface SortableBlockProps {
  block: Block;
}

export function SortableBlock({ block }: SortableBlockProps) {
  const dispatch = useDispatch();
  const selectedBlockId = useSelector((state: any) => state.document?.selectedBlockId);
  const isSelected = selectedBlockId === block.id;
  const [localWidth, setLocalWidth] = React.useState<string | null>(null);

  const [localHeight, setLocalHeight] = React.useState<string | null>(null);

  const startResize = (direction: 'right' | 'bottom' | 'bottom-right') => (e: React.MouseEvent) => {
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
        updates.width = `${finalWidthPct}%`;
      }
      if (direction === 'bottom' || direction === 'bottom-right') {
        const finalDeltaY = upEvent.clientY - startY;
        const finalHeightPx = Math.max(30, startPxHeight + finalDeltaY);
        updates.minHeight = `${finalHeightPx}px`;
      }
      
      setLocalWidth(null);
      setLocalHeight(null);
      dispatch(updateBlock({ id: block.id, updates: { styles: { ...block.styles, ...updates } } }));
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const getAlignmentStyle = () => {
    const align = block.styles?.alignment || 'left';
    if (align === 'center') return { margin: '0 auto' };
    if (align === 'right') return { marginLeft: 'auto' };
    return { marginRight: 'auto' };
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
    width: localWidth || block.styles?.width || '100%',
    minHeight: localHeight || block.styles?.minHeight || 'auto',
    padding: block.styles?.padding || '0px',
    ...getAlignmentStyle(),
  };

  return (
    <div
      ref={setNodeRef}
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
      {/* Drag Handle */}
      <div 
        {...attributes}
        {...listeners}
        className={clsx(
          "absolute -left-8 top-1/2 -translate-y-1/2 p-1 cursor-grab text-gray-300 hover:text-gray-500 opacity-0 group-hover/block:opacity-100 transition-opacity",
          isDragging && "cursor-grabbing opacity-100 text-gray-500"
        )}
      >
        <GripVertical className="w-5 h-5" />
      </div>

      {block.visibilityRule && (
        <div className="absolute top-2 right-2 bg-blue-100 text-blue-600 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 z-10 shadow-sm border border-blue-200">
          <EyeOff className="w-3 h-3" /> Rule Active
        </div>
      )}

      {/* Block Content Renderer */}
      <div className="p-4 w-full h-full">
        {block.type === 'heading' && <HeadingBlock block={block} isSelected={isSelected} />}
        {block.type === 'text' && <TextBlock block={block} isSelected={isSelected} />}
        {block.type === 'divider' && <DividerBlock block={block} isSelected={isSelected} />}
        {block.type === 'box' && <BoxBlock block={block} isSelected={isSelected} />}
        {block.type === 'image' && <ImageBlock block={block} isSelected={isSelected} />}
        {block.type === 'list' && <ListBlock block={block} isSelected={isSelected} />}
        {block.type === 'grid' && <GridBlock block={block} isSelected={isSelected} />}
        {block.type === 'signature' && <SignatureBlock block={block} isSelected={isSelected} />}
        {block.type === 'input' && <InputBlock block={block} isSelected={isSelected} />}
        {block.type === 'pagebreak' && <PageBreakBlock block={block} isSelected={isSelected} />}
        {/* Placeholder for other block types */}
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

      {/* Resize Handles */}
      {isSelected && (
        <>
          {/* Right edge */}
          <div 
            onMouseDown={startResize('right')}
            className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-8 bg-indigo-500 rounded-full shadow-sm cursor-col-resize opacity-0 group-hover/block:opacity-100 transition-opacity z-10 hover:bg-indigo-600 hover:scale-110 active:bg-indigo-700"
          />
          {/* Bottom edge */}
          <div 
            onMouseDown={startResize('bottom')}
            className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-8 h-3 bg-indigo-500 rounded-full shadow-sm cursor-row-resize opacity-0 group-hover/block:opacity-100 transition-opacity z-10 hover:bg-indigo-600 hover:scale-110 active:bg-indigo-700"
          />
          {/* Bottom Right Corner */}
          <div 
            onMouseDown={startResize('bottom-right')}
            className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-indigo-500 rounded-full shadow-sm cursor-nwse-resize opacity-0 group-hover/block:opacity-100 transition-opacity z-10 hover:bg-indigo-600 hover:scale-110 active:bg-indigo-700"
          />
        </>
      )}
    </div>
  );
}
