'use client';

import React, { useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateBlock, Block } from '../../../../../../redux/slices/documentSlice';

interface BoxBlockProps {
  block: Block;
  isSelected: boolean;
}

export function BoxBlock({ block, isSelected }: BoxBlockProps) {
  const dispatch = useDispatch();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const documentDetails = useSelector((state: any) => state.document?.documentDetails);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    dispatch(updateBlock({
      id: block.id,
      updates: {
        content: { ...block.content, text: e.target.value }
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
  }, [isSelected, block.content?.text]);

  const s = block.styles || {};
  const backgroundColor = (s.backgroundColor as string) || '#f8fafc';
  const borderColor = (s.borderColor as string) || '#e2e8f0';
  const borderStyle = (s.borderStyle as any) || 'solid';
  const borderWidth = s.borderWidth !== undefined ? Number(s.borderWidth) : 1;
  const borderRadius = s.borderRadius !== undefined ? Number(s.borderRadius) : 12;
  const boxShadow = (s.boxShadow as string) || '0 1px 3px 0 rgba(0, 0, 0, 0.05)';
  const padding = s.padding !== undefined ? `${s.padding}` : '20px';

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

  const color = (s.color as string) || '#1e293b';
  const fontSize = s.fontSize ? `${s.fontSize}px` : undefined;
  const fontFamily = (s.fontFamily as string) || undefined;
  const fontWeight = s.fontWeight ? (fontWeightMap[s.fontWeight as string] || s.fontWeight) : undefined;
  const fontStyle = (s.fontStyle as any) || undefined;
  const textDecoration = (s.textDecoration as any) || undefined;
  const textAlign = (s.alignment as any) || (s.textAlign as any) || 'left';
  const letterSpacing = s.letterSpacing ? (letterSpacingMap[s.letterSpacing as string] || s.letterSpacing) : undefined;
  const lineHeight = (s.lineHeight as any) || 1.6;

  const getRenderedText = () => {
    let text = block.content?.text || 'Enter text in box container...';
    if (!documentDetails) return text;
    Object.keys(documentDetails).forEach(key => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      text = text.replace(regex, documentDetails[key] || '');
    });
    return text;
  };

  return (
    <div 
      className="w-full transition-all relative group"
      style={{
        backgroundColor,
        borderColor: borderStyle === 'none' ? 'transparent' : borderColor,
        borderStyle,
        borderWidth: `${borderWidth}px`,
        borderRadius: `${borderRadius}px`,
        boxShadow,
        padding,
        color,
        fontSize,
        fontFamily,
        fontWeight,
        fontStyle,
        textDecoration,
        textAlign,
        letterSpacing,
        lineHeight
      }}
    >
      {isSelected ? (
        <textarea
          ref={textareaRef}
          value={block.content?.text || ''}
          onChange={handleChange}
          className="w-full text-inherit font-inherit leading-inherit tracking-inherit bg-transparent border-none outline-none focus:ring-0 p-0 m-0 resize-none overflow-hidden placeholder-gray-400"
          placeholder="Type notes, callout description, or section container content..."
          autoFocus
          rows={1}
        />
      ) : (
        <p className="text-inherit font-inherit leading-inherit tracking-inherit min-h-[24px] whitespace-pre-wrap">
          {getRenderedText()}
        </p>
      )}
    </div>
  );
}
