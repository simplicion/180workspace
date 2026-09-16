'use client';

import React from 'react';
import { Block } from '../../../../../../redux/slices/documentSlice';
import { Image as ImageIcon } from 'lucide-react';
import clsx from 'clsx';

interface ImageBlockProps {
  block: Block;
  isSelected?: boolean;
}

export function ImageBlock({ block }: ImageBlockProps) {
  const content = block.content || {};
  const styles = block.styles || {};

  const url = content.url || '';
  const caption = content.caption || '';
  const width = styles.width || content.width || '100%';
  const alignment = styles.alignment || 'center';
  const borderRadius = styles.borderRadius !== undefined ? `${styles.borderRadius}px` : '8px';
  const boxShadow = styles.boxShadow || 'none';

  const alignClass = {
    left: 'items-start text-left',
    center: 'items-center text-center',
    right: 'items-end text-right'
  }[alignment as 'left' | 'center' | 'right'] || 'items-center text-center';

  return (
    <div className={clsx("w-full flex flex-col py-2", alignClass)}>
      {url && url.trim().length > 0 ? (
        <div style={{ width: typeof width === 'number' ? `${width}px` : width, maxWidth: '100%' }} className="flex flex-col gap-1.5">
          <img 
            src={url} 
            alt={caption || 'Document Image'} 
            style={{ borderRadius, boxShadow: typeof boxShadow === 'string' ? boxShadow : undefined }}
            className="w-full object-contain transition-all"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/800x400?text=Image+Load+Error';
            }}
          />
          {caption && (
            <p className="text-[11px] text-gray-500 italic mt-0.5">{caption}</p>
          )}
        </div>
      ) : (
        <div 
          style={{ width: typeof width === 'number' ? `${width}px` : width, maxWidth: '100%', borderRadius }}
          className="w-full h-40 bg-gray-50 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 text-gray-400 select-none"
        >
          <ImageIcon className="w-6 h-6 mb-1.5 text-gray-400 stroke-1" />
          <p className="text-xs font-semibold text-gray-500">Image Element</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Upload image or enter URL in Properties panel</p>
        </div>
      )}
    </div>
  );
}
