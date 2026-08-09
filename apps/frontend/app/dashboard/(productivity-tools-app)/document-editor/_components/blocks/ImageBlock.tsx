import React from 'react';
import { useDispatch } from 'react-redux';
import { updateBlock, Block } from '../../../../../../redux/slices/documentSlice';
import { Image as ImageIcon, Upload } from 'lucide-react';

interface ImageBlockProps {
  block: Block;
  isSelected: boolean;
}

export function ImageBlock({ block, isSelected }: ImageBlockProps) {
  const dispatch = useDispatch();

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(updateBlock({
      id: block.id,
      updates: {
        content: { ...block.content, url: e.target.value }
      }
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        dispatch(updateBlock({
          id: block.id,
          updates: {
            content: { ...block.content, url: base64String }
          }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(updateBlock({
      id: block.id,
      updates: {
        content: { ...block.content, width: e.target.value }
      }
    }));
  };

  const hasValidUrl = block.content?.url && block.content.url.trim().length > 0;
  const width = block.content?.width || '100%';

  return (
    <div className="w-full flex flex-col gap-2">
      {isSelected && (
        <div className="flex flex-col gap-2 p-2 bg-gray-50 border border-gray-200 rounded-md">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={block.content?.url || ''}
              onChange={handleUrlChange}
              placeholder="Paste image URL here..."
              className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-sm text-gray-700"
            />
            <label className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-md text-xs font-bold cursor-pointer hover:bg-indigo-100 transition-colors">
              <Upload className="w-3 h-3" />
              Upload
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
          <div className="flex items-center gap-2 px-2 border-t border-gray-200 pt-2 mt-1">
            <span className="text-xs text-gray-500 font-medium">Width:</span>
            <input
              type="text"
              value={block.content?.width || ''}
              onChange={handleWidthChange}
              placeholder="e.g. 100%, 300px"
              className="w-32 bg-white border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 outline-none"
            />
          </div>
        </div>
      )}
      
      {hasValidUrl ? (
        <img 
          src={block.content.url} 
          alt="Document Block" 
          style={{ width: width, maxWidth: '100%' }}
          className="rounded-md object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/800x400?text=Invalid+Image+URL';
          }}
        />
      ) : (
        <div className="w-full h-48 bg-gray-100 flex items-center justify-center rounded-md border-2 border-dashed border-gray-300">
          <p className="text-gray-400 font-medium">No image URL provided</p>
        </div>
      )}
    </div>
  );
}
