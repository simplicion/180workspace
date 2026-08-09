import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateBlock, Block } from '../../../../../../redux/slices/documentSlice';
import { Heading1, Heading2, Heading3 } from 'lucide-react';
import clsx from 'clsx';

interface HeadingBlockProps {
  block: Block;
  isSelected: boolean;
}

export function HeadingBlock({ block, isSelected }: HeadingBlockProps) {
  const dispatch = useDispatch();
  const documentDetails = useSelector((state: any) => state.document?.documentDetails);

  const level = block.content?.level || 'h1';

  // Replace variables in text
  const getRenderedText = () => {
    let text = block.content?.text || 'Heading';
    if (!documentDetails) return text;
    
    Object.keys(documentDetails).forEach(key => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      text = text.replace(regex, documentDetails[key] || '');
    });
    return text;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(updateBlock({
      id: block.id,
      updates: {
        content: { ...block.content, text: e.target.value }
      }
    }));
  };

  const setLevel = (newLevel: 'h1' | 'h2' | 'h3') => {
    dispatch(updateBlock({
      id: block.id,
      updates: {
        content: { ...block.content, level: newLevel }
      }
    }));
  };

  const getFontSize = (l: string) => {
    switch (l) {
      case 'h1': return 'text-4xl';
      case 'h2': return 'text-2xl';
      case 'h3': return 'text-xl';
      default: return 'text-4xl';
    }
  };

  const Tag = level as any;

  const customStyles: React.CSSProperties = {
    fontSize: block.styles?.fontSize ? `${block.styles.fontSize}px` : undefined,
    color: block.styles?.color as string || undefined,
    fontFamily: block.styles?.fontFamily as string || undefined,
  };

  return (
    <div className="w-full group relative" style={customStyles}>
      {isSelected ? (
        <div className="bg-white border border-indigo-200 rounded-lg p-2 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent">
          <div className="flex items-center gap-1 mb-2 border-b border-gray-100 pb-2 flex-wrap">
            <button onClick={() => setLevel('h1')} className={clsx('p-1 rounded flex items-center', level === 'h1' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100')}><Heading1 className="w-4 h-4" /></button>
            <button onClick={() => setLevel('h2')} className={clsx('p-1 rounded flex items-center', level === 'h2' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100')}><Heading2 className="w-4 h-4" /></button>
            <button onClick={() => setLevel('h3')} className={clsx('p-1 rounded flex items-center', level === 'h3' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100')}><Heading3 className="w-4 h-4" /></button>
            <div className="w-px h-4 bg-gray-200 mx-1" />
            <select 
              onChange={(e) => {
                if (e.target.value) {
                  handleChange({ target: { value: (block.content?.text || '') + `{{${e.target.value}}}` } } as any);
                  e.target.value = '';
                }
              }}
              className="text-xs border border-gray-200 rounded px-2 py-1 text-indigo-600 bg-indigo-50 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">{`{ }`} Insert Variable</option>
              <option value="clientName">Client Name</option>
              <option value="clientEmail">Client Email</option>
              <option value="clientAddress">Client Address</option>
              <option value="employeeName">Employee Name</option>
              <option value="employeeEmail">Employee Email</option>
              <option value="totalAmount">Total Amount</option>
              <option value="validUntil">Valid Until</option>
            </select>
          </div>
          <input
            type="text"
            value={block.content?.text || ''}
            onChange={handleChange}
            className={`w-full font-bold text-gray-900 leading-tight bg-transparent border-none outline-none focus:ring-0 p-0 m-0 ${getFontSize(level)}`}
            placeholder="Heading"
            autoFocus
          />
        </div>
      ) : (
        <Tag className={`${getFontSize(level)} font-bold text-gray-900 leading-tight min-h-[40px]`}>
          {getRenderedText()}
        </Tag>
      )}
    </div>
  );
}
