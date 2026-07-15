import React, { useState } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';
import { useAddCompanyProductMutation } from '@/redux/api/companyApi';
import api from '@/lib/api';

interface AddProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    companyId: string;
}

export function AddProductModal({ isOpen, onClose, companyId }: AddProductModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [link, setLink] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const [addProduct, { isLoading }] = useAddCompanyProductMutation();

    if (!isOpen) return null;

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setError('');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await api.post('/api/branding/logo', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.data?.url) {
                setLogoUrl(response.data.url);
            } else {
                setError('Failed to upload image');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error uploading image');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!name) {
            setError('Product name is required');
            return;
        }

        try {
            const res = await addProduct({
                companyId,
                name,
                description,
                link,
                logoUrl
            }).unwrap();

            if (res.success) {
                onClose();
                setName('');
                setDescription('');
                setLink('');
                setLogoUrl('');
            }
        } catch (err: any) {
            setError(err.data?.message || 'Failed to add product');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900">Add Product</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[70vh]">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-xl">
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        
                        <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2">Product Logo (Optional)</label>
                            <div className="flex items-center gap-4">
                                {logoUrl ? (
                                    <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200">
                                        <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                                        <button 
                                            type="button" 
                                            onClick={() => setLogoUrl('')}
                                            className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-md hover:bg-red-50 text-red-500 transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center w-20 h-20 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors relative overflow-hidden group">
                                        {uploading ? (
                                            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                                        ) : (
                                            <Upload className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors" />
                                        )}
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                                    </label>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2">Title</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                placeholder="Enter product title"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2">Description</label>
                            <textarea
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none h-24"
                                placeholder="Enter product description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2">Link</label>
                            <input
                                type="url"
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                placeholder="https://example.com"
                                value={link}
                                onChange={(e) => setLink(e.target.value)}
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2.5 rounded-xl text-gray-700 font-semibold hover:bg-gray-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || uploading}
                                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                            >
                                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                {isLoading ? 'Saving...' : 'Save Product'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
