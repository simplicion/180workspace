import { LogoLoader } from "@workspace/ui";
import React, { useState } from 'react';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { useAddCompanyMediaMutation } from '@/redux/api/companyApi';
import api from '@/lib/api';

interface UploadMediaModalProps {
    isOpen: boolean;
    onClose: () => void;
    companyId: string;
}

export function UploadMediaModal({ isOpen, onClose, companyId }: UploadMediaModalProps) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    
    const [addMedia, { isLoading }] = useAddCompanyMediaMutation();

    if (!isOpen) return null;

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setError('');

        const formData = new FormData();
        formData.append('file', file); // using existing logo upload API

        try {
            const response = await api.post('/api/branding/logo', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.data?.url) {
                // Instantly save to the media table after successful upload
                const res = await addMedia({
                    companyId,
                    imageUrl: response.data.url
                }).unwrap();

                if (res.success) {
                    onClose();
                }
            } else {
                setError('Failed to upload image');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || err.data?.message || 'Error uploading image');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900">Upload Photo</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-xl">
                            {error}
                        </div>
                    )}
                    
                    <div className="flex flex-col items-center justify-center py-8">
                        <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors relative overflow-hidden group">
                            {uploading || isLoading ? (
                                <div className="flex flex-col items-center space-y-3">
                                    <LogoLoader className="w-8 h-8 text-blue-500 animate-spin" />
                                    <span className="text-sm font-medium text-gray-500">Uploading photo...</span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center space-y-3">
                                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                                        <ImageIcon className="w-6 h-6" />
                                    </div>
                                    <span className="text-sm font-medium text-gray-500 group-hover:text-blue-600">Click or drag to upload photo</span>
                                </div>
                            )}
                            <input 
                                type="file" 
                                className="hidden" 
                                accept="image/png, image/jpeg, image/jpg, image/webp" 
                                onChange={handleImageUpload} 
                                disabled={uploading || isLoading} 
                            />
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}
