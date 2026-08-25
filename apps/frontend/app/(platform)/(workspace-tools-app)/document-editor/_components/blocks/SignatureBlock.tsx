import React from 'react';
import { useDispatch } from 'react-redux';
import { updateBlock, Block } from '../../../../../../redux/slices/documentSlice';
import { PenTool } from 'lucide-react';
import { SignaturePad } from '../ui/SignaturePad';
import { useAuth } from '@/lib/auth-context';
import VerifyPasswordModal from '@/components/shared/VerifyPasswordModal';

interface SignatureBlockProps {
  block: Block;
  isSelected: boolean;
}

export function SignatureBlock({ block, isSelected }: SignatureBlockProps) {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const [showVerifyModal, setShowVerifyModal] = React.useState(false);

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(updateBlock({
      id: block.id,
      updates: {
        content: { ...block.content, label: e.target.value }
      }
    }));
  };

  const handleToggleName = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(updateBlock({
      id: block.id,
      updates: {
        content: { ...block.content, requireName: e.target.checked }
      }
    }));
  };

  const handleSignatureSave = (dataUrl: string) => {
    dispatch(updateBlock({
      id: block.id,
      updates: {
        content: { ...block.content, signatureImage: dataUrl }
      }
    }));
  };

  return (
    <div className="w-full flex flex-col gap-4 max-w-sm">
      <VerifyPasswordModal 
          isOpen={showVerifyModal} 
          onClose={() => setShowVerifyModal(false)} 
          onSuccess={() => {
              if (user?.signatureImage) {
                  handleSignatureSave(user.signatureImage);
              }
          }}
          title="Verify Signature Application"
          description="Please enter your password to authorize applying your saved digital signature."
          buttonText="Apply Signature"
      />
      {isSelected && (
        <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg mb-2">
          <div className="mb-3">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Signature Label</label>
            <input 
              type="text" 
              value={block.content?.label || ''} 
              onChange={handleLabelChange}
              placeholder="e.g. Authorized Signatory"
              className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="flex items-center justify-between mt-4">
            <label className="text-xs font-semibold text-gray-700">Require printed name</label>
            <input 
              type="checkbox" 
              checked={block.content?.requireName || false} 
              onChange={handleToggleName}
              className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
            />
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
             <div className="flex items-center justify-between mb-2">
                 <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Pre-Sign Document (Optional)</label>
                 {user?.signatureImage && (
                     <button 
                         onClick={() => setShowVerifyModal(true)}
                         className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-100 transition-colors font-medium"
                     >
                         Apply Saved Signature
                     </button>
                 )}
             </div>
             <SignaturePad onSave={handleSignatureSave} onClear={() => handleSignatureSave('')} initialValue={block.content?.signatureImage} />
          </div>
        </div>
      )}
      
      <div className="flex flex-col gap-1 w-64 mt-4">
        <div className="h-20 border-b border-gray-400 border-dashed flex items-end justify-center pb-2 relative bg-gray-50/50 rounded-t-md">
          {block.content?.signatureImage ? (
            <img src={block.content.signatureImage} alt="Signature" className="h-16 object-contain" />
          ) : (
            <PenTool className="w-4 h-4 text-gray-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-50" />
          )}
        </div>
        <p className="text-sm font-semibold text-gray-700 text-center mt-1">
          {block.content?.label || 'Signature'}
        </p>
        
        {block.content?.requireName && (
          <div className="mt-4">
             <div className="h-8 border-b border-gray-300 flex items-end pb-1">
               <span className="text-xs font-medium text-gray-400 ml-1">Name:</span>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
