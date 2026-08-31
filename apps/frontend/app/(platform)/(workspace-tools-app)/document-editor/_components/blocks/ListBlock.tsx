'use client';

import React, { useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { updateBlock, Block } from '../../../../../../redux/slices/documentSlice';
import { CheckSquare, Square } from 'lucide-react';
import clsx from 'clsx';

interface ListBlockProps {
  block: Block;
  isSelected: boolean;
}

export function ListBlock({ block, isSelected }: ListBlockProps) {
  const dispatch = useDispatch();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const content = block.content || {};
  const styles = block.styles || {};
  const items: string[] = Array.isArray(content.items) ? content.items : ['First item', 'Second item'];
  const listStyle = content.listStyle || styles.listType || 'bullet';
  const itemSpacing = styles.itemSpacing !== undefined ? `${styles.itemSpacing}px` : '4px';

  const rawText = items.join('\n');

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newItems = e.target.value.split('\n');
    dispatch(updateBlock({
      id: block.id,
      updates: {
        content: { ...content, items: newItems }
      }
    }));
    adjustHeight();
  };

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    if (isSelected) {
      adjustHeight();
    }
  }, [isSelected, rawText]);

  const letterSpacingMap: Record<string, string> = {
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
  };

  const fontWeightMap: Record<string, number> = {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    black: 900,
  };

  const customStyles: React.CSSProperties = {
    fontSize: styles.fontSize ? `${styles.fontSize}px` : undefined,
    color: styles.color as string || undefined,
    fontFamily: styles.fontFamily as string || undefined,
    fontWeight: styles.fontWeight ? (fontWeightMap[styles.fontWeight as string] || styles.fontWeight) : undefined,
    fontStyle: styles.fontStyle as any || undefined,
    textDecoration: styles.textDecoration as any || undefined,
    textAlign: styles.alignment as any || styles.textAlign as any || 'left',
    letterSpacing: styles.letterSpacing ? (letterSpacingMap[styles.letterSpacing as string] || styles.letterSpacing) : undefined,
    lineHeight: styles.lineHeight || 1.6
  };

  return (
    <div className="w-full pl-4" style={customStyles}>
      {isSelected ? (
        <div className="relative w-full">
          <div className="absolute left-[-1rem] top-1 bottom-0 w-0.5 bg-indigo-200 rounded-full" />
          <textarea
            ref={textareaRef}
            value={rawText}
            onChange={handleChange}
            className="w-full text-inherit font-inherit leading-inherit tracking-inherit bg-transparent border-none outline-none focus:ring-0 p-0 m-0 resize-none overflow-hidden placeholder-gray-400"
            placeholder="Enter list items (one per line)..."
            autoFocus
            rows={1}
          />
        </div>
      ) : listStyle === 'numbered' ? (
        <ol className="list-decimal text-inherit font-inherit leading-inherit tracking-inherit marker:text-gray-400" style={{ display: 'flex', flexDirection: 'column', gap: itemSpacing }}>
          {items.length > 0 ? (
            items.map((item, idx) => (
              <li key={idx} className="min-h-[22px]">
                {item || '\u00A0'}
              </li>
            ))
          ) : (
            <li>Enter list items...</li>
          )}
        </ol>
      ) : listStyle === 'checklist' ? (
        <div className="flex flex-col text-inherit font-inherit leading-inherit tracking-inherit" style={{ gap: itemSpacing }}>
          {items.length > 0 ? (
            items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 min-h-[22px]">
                <Square className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span>{item || '\u00A0'}</span>
              </div>
            ))
          ) : (
            <div className="flex items-center gap-2">
              <Square className="w-3.5 h-3.5 text-gray-400" />
              <span>Enter checklist item...</span>
            </div>
          )}
        </div>
      ) : (
        <ul className="list-disc text-gray-800 leading-relaxed marker:text-gray-400" style={{ display: 'flex', flexDirection: 'column', gap: itemSpacing }}>
          {items.length > 0 ? (
            items.map((item, idx) => (
              <li key={idx} className="min-h-[22px]">
                {item || '\u00A0'}
              </li>
            ))
          ) : (
            <li>Enter list items...</li>
          )}
        </ul>
      )}
    </div>
  );
}
