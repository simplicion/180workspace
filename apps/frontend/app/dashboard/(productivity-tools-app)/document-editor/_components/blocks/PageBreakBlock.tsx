import React from 'react';
import { Block } from '../../../../../../redux/slices/documentSlice';

interface PageBreakBlockProps {
  block: Block;
  isSelected: boolean;
}

export function PageBreakBlock({ block, isSelected }: PageBreakBlockProps) {
  return (
    <div className="w-full py-4 flex items-center justify-center relative my-2">
      <hr className="w-full border-t-2 border-dashed border-gray-300" />
      <span className="absolute bg-gray-100 text-gray-500 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-gray-200">
        Page Break
      </span>
    </div>
  );
}
