import React, { useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { updateBlock, Block } from '../../../../../../redux/slices/documentSlice';

interface BoxBlockProps {
  block: Block;
  isSelected: boolean;
}

export function BoxBlock({ block, isSelected }: BoxBlockProps) {
  const dispatch = useDispatch();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const backgroundColor = block.styles?.backgroundColor || '#f9fafb';
  const borderColor = block.styles?.borderColor || '#e5e7eb';
  const borderRadius = block.styles?.borderRadius ?? 6;

  return (
    <div 
      className="w-full p-6 border shadow-sm"
      style={{
        backgroundColor: backgroundColor as string,
        borderColor: borderColor as string,
        borderRadius: `${borderRadius}px`
      }}
    >
      {isSelected ? (
        <textarea
          ref={textareaRef}
          value={block.content?.text || ''}
          onChange={handleChange}
          className="w-full text-gray-800 leading-relaxed bg-transparent border-none outline-none focus:ring-0 p-0 m-0 resize-none overflow-hidden"
          placeholder="Enter text in box..."
          autoFocus
          rows={1}
        />
      ) : (
        <p className="text-gray-800 leading-relaxed min-h-[24px] whitespace-pre-wrap">
          {block.content?.text || 'Enter text in box...'}
        </p>
      )}
    </div>
  );
}
