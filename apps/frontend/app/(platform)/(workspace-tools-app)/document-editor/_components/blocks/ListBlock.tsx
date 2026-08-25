import React, { useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { updateBlock, Block } from '../../../../../../redux/slices/documentSlice';

interface ListBlockProps {
  block: Block;
  isSelected: boolean;
}

export function ListBlock({ block, isSelected }: ListBlockProps) {
  const dispatch = useDispatch();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const rawText = block.content?.items ? (block.content.items as string[]).join('\n') : '';

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newItems = e.target.value.split('\n');
    dispatch(updateBlock({
      id: block.id,
      updates: {
        content: { ...block.content, items: newItems }
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

  const customStyles: React.CSSProperties = {
    fontSize: block.styles?.fontSize ? `${block.styles.fontSize}px` : undefined,
    color: block.styles?.color as string || undefined,
    fontFamily: block.styles?.fontFamily as string || undefined,
  };

  return (
    <div className="w-full pl-6" style={customStyles}>
      {isSelected ? (
        <div className="relative w-full">
          {/* Visual indicator for list edit mode */}
          <div className="absolute left-[-1.5rem] top-1 bottom-0 w-1 bg-gray-200 rounded-full" />
          <textarea
            ref={textareaRef}
            value={rawText}
            onChange={handleChange}
            className="w-full text-gray-700 leading-relaxed bg-transparent border-none outline-none focus:ring-0 p-0 m-0 resize-none overflow-hidden"
            placeholder="Enter list items (one per line)..."
            autoFocus
            rows={1}
          />
        </div>
      ) : (
        block.styles?.listType === 'number' ? (
          <ol className="list-decimal text-gray-700 leading-relaxed marker:text-gray-400 space-y-1">
            {block.content?.items && (block.content.items as string[]).length > 0 ? (
              (block.content.items as string[]).map((item, idx) => (
                <li key={idx} className="min-h-[24px]">
                  {item || '\u00A0'}
                </li>
              ))
            ) : (
              <li>Enter list items (one per line)...</li>
            )}
          </ol>
        ) : (
          <ul className="list-disc text-gray-700 leading-relaxed marker:text-gray-400 space-y-1">
            {block.content?.items && (block.content.items as string[]).length > 0 ? (
              (block.content.items as string[]).map((item, idx) => (
                <li key={idx} className="min-h-[24px]">
                  {item || '\u00A0'}
                </li>
              ))
            ) : (
              <li>Enter list items (one per line)...</li>
            )}
          </ul>
        )
      )}
    </div>
  );
}
