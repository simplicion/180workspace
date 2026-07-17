import { LogoLoader } from "@workspace/ui";
import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export type UploadState = 'uploading' | 'processing' | 'success' | 'error';

interface UploadToastProps {
  id: string;
  state: UploadState;
  progress: number;
  message?: string;
}

export function UploadToast({ id, state, progress, message }: UploadToastProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 w-[300px] flex items-center gap-3 animate-in slide-in-from-bottom-5">
      <div className="shrink-0 flex items-center justify-center">
        {state === 'uploading' || state === 'processing' ? (
          <div className="relative flex items-center justify-center w-8 h-8">
            <svg className="w-8 h-8 transform -rotate-90">
              <circle
                cx="16"
                cy="16"
                r="14"
                stroke="currentColor"
                strokeWidth="3"
                fill="transparent"
                className="text-gray-100"
              />
              <circle
                cx="16"
                cy="16"
                r="14"
                stroke="currentColor"
                strokeWidth="3"
                fill="transparent"
                strokeDasharray={14 * 2 * Math.PI}
                strokeDashoffset={14 * 2 * Math.PI - (progress / 100) * (14 * 2 * Math.PI)}
                className="text-blue-600 transition-all duration-300"
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-[9px] font-bold text-gray-700">
              {Math.round(progress)}%
            </span>
          </div>
        ) : state === 'success' ? (
          <CheckCircle className="w-8 h-8 text-green-500" />
        ) : (
          <XCircle className="w-8 h-8 text-red-500" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-[14px] font-bold text-gray-900 truncate">
          {state === 'uploading' && 'Uploading media...'}
          {state === 'processing' && 'Processing video...'}
          {state === 'success' && 'Post published!'}
          {state === 'error' && 'Upload failed'}
        </h4>
        <p className="text-[12px] text-gray-500 truncate">
          {message || (state === 'processing' ? 'This might take a few minutes' : 'Please wait while we upload')}
        </p>
      </div>

      {(state === 'success' || state === 'error') && (
        <button
          onClick={() => toast.dismiss(id)}
          className="shrink-0 text-[12px] font-medium text-gray-500 hover:text-gray-900"
        >
          Close
        </button>
      )}
    </div>
  );
}
