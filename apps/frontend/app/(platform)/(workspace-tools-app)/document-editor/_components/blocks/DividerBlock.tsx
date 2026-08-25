import React from 'react';
import { Block } from '../../../../../../redux/slices/documentSlice';

interface DividerBlockProps {
  block: Block;
  isSelected: boolean;
}

export function DividerBlock({ block, isSelected }: DividerBlockProps) {
  const borderWidth = block.styles?.borderWidth || 2;
  const borderStyle = block.styles?.borderStyle || 'solid';
  const borderColor = block.styles?.borderColor || '#d1d5db';

  return (
    <div className="w-full py-4 flex items-center justify-center">
      <hr 
        className="w-full border-t" 
        style={{ 
          borderWidth: `${borderWidth}px`, 
          borderStyle: borderStyle as any, 
          borderColor: borderColor as string 
        }} 
      />
    </div>
  );
}
