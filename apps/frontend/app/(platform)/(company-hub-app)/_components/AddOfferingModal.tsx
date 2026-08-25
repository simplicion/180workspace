import { LogoLoader } from "@workspace/ui";
import React, { useState } from 'react';
import { X, Upload } from 'lucide-react';
import { useAddCompanyServiceMutation } from '@/redux/api/companyApi';
import api from '@/lib/api';
import dynamic from 'next/dynamic';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false }) as any;
import 'react-quill-new/dist/quill.snow.css';

interface AddOfferingModalProps {
    isOpen: boolean;
    onClose: () => void;
    companyId: string;
}

export function AddOfferingModal({ isOpen, onClose, companyId }: AddOfferingModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [startingPrice, setStartingPrice] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [detailedDescription, setDetailedDescription] = useState('');
    const [link, setLink] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    const [addCompanyService, { isLoading }] = useAddCompanyServiceMutation();

    if (!isOpen) return null;

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploading(true);
            const data = new FormData();
            data.append('file', file);
            const res = await api.post('/api/branding/logo', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setImageUrl(res.data.url);
        } catch (error) {
            console.error('Failed to upload image:', error);
            // Optionally add toast for error
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addCompanyService({
                companyId,
                name,
                description,
                detailedDescription,
                startingPrice,
                imageUrl,
                link
            }).unwrap();
            onClose();
            // Optionally reset state here
        } catch (error) {
            console.error('Failed to add offering:', error);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden relative max-h-[90vh] flex flex-col">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
                    <h2 className="text-lg font-bold text-gray-900">Add New Offering</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Image Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Offering Image / Logo</label>
                            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:bg-gray-50 transition-colors">
                                <div className="space-y-1 text-center">
                                    {imageUrl ? (
                                        <div className="relative">
                                            <img src={imageUrl} alt="Offering Preview" className="mx-auto h-32 object-contain" />
                                            <button 
                                                type="button" 
                                                onClick={() => setImageUrl('')}
                                                className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 translate-x-1/2 -translate-y-1/2"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            {isUploading ? (
                                                <LogoLoader className="mx-auto h-12 w-12 text-gray-400 animate-spin" />
                                            ) : (
                                                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                            )}
                                            <div className="flex text-sm text-gray-600 justify-center">
                                                <label htmlFor="offering-image-upload" className="relative cursor-pointer rounded-md bg-white font-medium text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 hover:text-blue-500">
                                                    <span>Upload a file</span>
                                                    <input id="offering-image-upload" name="offering-image-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
                                                </label>
                                            </div>
                                            <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Offering Title</label>
                            <input 
                                type="text" 
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all" 
                                placeholder="e.g. Custom Software Development" 
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Short Description (Max 2 lines)</label>
                            <textarea 
                                required
                                rows={2} 
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                maxLength={150}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all resize-none" 
                                placeholder="Brief overview of the offering..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Highlighted Text (Price or Detail)</label>
                            <input 
                                type="text" 
                                value={startingPrice}
                                onChange={(e) => setStartingPrice(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all" 
                                placeholder="e.g. Starting at $99/hr or Free Trial Available" 
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Link</label>
                            <input 
                                type="url" 
                                value={link}
                                onChange={(e) => setLink(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all" 
                                placeholder="https://example.com/offering" 
                            />
                        </div>

                        <div className="mb-8">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Detailed Description (Optional)</label>
                            <div className="h-40 mb-12">
                                <ReactQuill 
                                    theme="snow"
                                    value={detailedDescription}
                                    onChange={setDetailedDescription}
                                    className="h-full rounded-lg"
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 mt-4">
                            <button 
                                type="button" 
                                onClick={onClose} 
                                className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                disabled={isLoading || isUploading}
                                className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isLoading ? <LogoLoader className="w-4 h-4 animate-spin" /> : null}
                                Save Offering
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
