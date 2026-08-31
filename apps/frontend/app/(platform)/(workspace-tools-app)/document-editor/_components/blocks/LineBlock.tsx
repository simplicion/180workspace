'use client';

import React from 'react';
import { useDispatch } from 'react-redux';
import { removeBlock, Block } from '../../../../../../redux/slices/documentSlice';
import { Scissors, Trash2 } from 'lucide-react';
import clsx from 'clsx';

interface LineBlockProps {
  block: Block;
  isSelected: boolean;
}

export function LineBlock({ block, isSelected }: LineBlockProps) {
  const dispatch = useDispatch();
  const s = block.styles || {};
  const orientation = (s.orientation as string) || 'horizontal';
  const borderWidth = s.borderWidth !== undefined ? Number(s.borderWidth) : 2;
  const borderStyle = ((s.borderStyle as any) || 'solid');
  const borderColor = ((s.borderColor as string) || '#cbd5e1');
  const width = (s.width as string) || '100%';
  const alignment = (s.alignment as string) || 'center';

  const getMarginStyle = () => {
    if (alignment === 'left') return { marginLeft: '0', marginRight: 'auto' };
    if (alignment === 'right') return { marginLeft: 'auto', marginRight: '0' };
    return { marginLeft: 'auto', marginRight: 'auto' };
  };

  if (orientation === 'vertical') {
    const height = (s.height as string) || '64px';
    return (
      <div className="w-full py-2 flex items-center justify-center">
        <div 
          style={{
            height,
            borderLeftWidth: `${borderWidth}px`,
            borderLeftStyle: borderStyle,
            borderLeftColor: borderColor,
            ...getMarginStyle()
          }}
        />
      </div>
    );
  }

  return (
    <div className="w-full py-4 flex items-center justify-center">
      <hr 
        className="border-0 border-t transition-all" 
        style={{ 
          width,
          borderTopWidth: `${borderWidth}px`, 
          borderTopStyle: borderStyle, 
          borderTopColor: borderColor,
          ...getMarginStyle()
        }} 
      />
    </div>
  );
}
