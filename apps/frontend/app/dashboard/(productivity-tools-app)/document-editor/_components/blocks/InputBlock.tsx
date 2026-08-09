import React from 'react';
import { useDispatch } from 'react-redux';
import { updateBlock, Block } from '../../../../../../redux/slices/documentSlice';
import { Settings } from 'lucide-react';

interface InputBlockProps {
  block: Block;
  isSelected: boolean;
}

export function InputBlock({ block, isSelected }: InputBlockProps) {
  const dispatch = useDispatch();

  const handleChange = (field: string, value: any) => {
    dispatch(updateBlock({
      id: block.id,
      updates: {
        content: { ...block.content, [field]: value }
      }
    }));
  };

  const inputType = block.content?.inputType || 'text';
  const label = block.content?.label || 'New Input Field';
  const required = block.content?.required || false;
  const placeholder = block.content?.placeholder || '';

  return (
    <div className="w-full relative group">
      {isSelected ? (
        <div className="bg-white border border-indigo-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-4 mb-4 border-b border-gray-100 pb-4">
            <div className="flex-1">
              <label className="text-xs font-bold text-gray-500 mb-1 block">Label</label>
              <input
                type="text"
                value={label}
                onChange={(e) => handleChange('label', e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-200 rounded outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Input Type</label>
              <select
                value={inputType}
                onChange={(e) => handleChange('inputType', e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-200 rounded outline-none focus:border-indigo-500"
              >
                <option value="text">Short Text</option>
                <option value="textarea">Long Text</option>
                <option value="date">Date</option>
                <option value="checkbox">Checkbox</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={required}
                  onChange={(e) => handleChange('required', e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                Required
              </label>
            </div>
          </div>
          <div className="mb-2">
            <label className="text-xs font-bold text-gray-500 mb-1 block">Placeholder (optional)</label>
            <input
              type="text"
              value={placeholder}
              onChange={(e) => handleChange('placeholder', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-200 rounded outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      ) : (
        <div className="p-2">
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          {inputType === 'text' && (
            <input
              type="text"
              placeholder={placeholder}
              disabled
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-500 cursor-not-allowed"
            />
          )}
          {inputType === 'textarea' && (
            <textarea
              placeholder={placeholder}
              disabled
              rows={3}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-500 cursor-not-allowed"
            />
          )}
          {inputType === 'date' && (
            <input
              type="date"
              disabled
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-500 cursor-not-allowed"
            />
          )}
          {inputType === 'checkbox' && (
            <input
              type="checkbox"
              disabled
              className="w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-not-allowed"
            />
          )}
        </div>
      )}
    </div>
  );
}
