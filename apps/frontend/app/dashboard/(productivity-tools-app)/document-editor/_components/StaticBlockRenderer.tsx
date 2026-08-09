import React from 'react';
import clsx from 'clsx';
import { X, Copy } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { selectBlock, removeBlock, duplicateBlock, Block } from '../../../../../redux/slices/documentSlice';
import { HeadingBlock } from './blocks/HeadingBlock';
import { TextBlock } from './blocks/TextBlock';
import { DividerBlock } from './blocks/DividerBlock';
import { BoxBlock } from './blocks/BoxBlock';
import { ImageBlock } from './blocks/ImageBlock';
import { ListBlock } from './blocks/ListBlock';
import { GridBlock } from './blocks/GridBlock';
import { SignatureBlock } from './blocks/SignatureBlock';
import { InputBlock } from './blocks/InputBlock';
import { PageBreakBlock } from './blocks/PageBreakBlock';
import { EyeOff } from 'lucide-react';

interface StaticBlockRendererProps {
  block: Block;
}

export function StaticBlockRenderer({ block }: StaticBlockRendererProps) {
  const dispatch = useDispatch();
  const selectedBlockId = useSelector((state: any) => state.document?.selectedBlockId);
  const isSelected = selectedBlockId === block.id;

  const getAlignmentStyle = () => {
    const align = block.styles?.alignment || 'left';
    if (align === 'center') return { margin: '0 auto' };
    if (align === 'right') return { marginLeft: 'auto' };
    return { marginRight: 'auto' };
  };

  const style = {
    width: block.styles?.width || '100%',
    minHeight: block.styles?.minHeight || 'auto',
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
    </div>
  );
}
