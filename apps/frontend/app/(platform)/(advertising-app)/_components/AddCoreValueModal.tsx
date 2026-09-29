import { LogoLoader } from "@workspace/ui";
import React, { useState } from 'react';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { useAddCompanyCoreValueMutation } from '@/redux/api/companyApi';
import api from '@/lib/api';

interface AddCoreValueModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AddCoreValueModal({ isOpen, onClose }: AddCoreValueModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');
    
    const [addCoreValue, { isLoading }] = useAddCompanyCoreValueMutation();

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            const objectUrl = URL.createObjectURL(selectedFile);
            setPreview(objectUrl);
        }
    };

    const handleRemoveFile = () => {
        setFile(null);
        setPreview(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!title.trim() || !description.trim()) {
            setError('Title and description are required.');
            return;
        }

        let uploadedUrl = null;

        if (file) {
            setIsUploading(true);
            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await api.post('/api/branding/logo', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                uploadedUrl = response.data.url;
            } catch (err: any) {
                console.error("Upload error", err);
                setError(err.response?.data?.message || 'Failed to upload image. Please try again.');
                setIsUploading(false);
                return;
            }
            setIsUploading(false);
        }

        try {
            await addCoreValue({
                title,
                description,
                iconUrl: uploadedUrl
            }).unwrap();
            
            setTitle('');
            setDescription('');
            handleRemoveFile();
            onClose();
        } catch (err: any) {
            setError(err.data?.message || 'Failed to add core value. You might have reached the limit of 10.');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">Add Core Value</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Image Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Icon / Image
                            </label>
                            
                            {!preview ? (
                                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:border-blue-400 hover:bg-blue-50/50 transition-colors group">
                                    <div className="space-y-1 text-center">
                                        <div className="mx-auto h-12 w-12 text-gray-400 group-hover:text-blue-500 bg-gray-50 group-hover:bg-white rounded-full flex items-center justify-center transition-colors">
                                            <Upload className="h-6 w-6" />
                                        </div>
                                        <div className="flex text-sm text-gray-600">
                                            <label htmlFor="core-value-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none px-1">
                                                <span>Upload a file</span>
                                                <input id="core-value-upload" name="core-value-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
                                            </label>
                                            <p className="pl-1">or drag and drop</p>
                                        </div>
                                        <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative rounded-xl overflow-hidden border border-gray-200 h-40 group flex justify-center bg-gray-50">
                                    <img src={preview} alt="Preview" className="h-full object-contain" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button type="button" onClick={handleRemoveFile} className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transform scale-90 group-hover:scale-100 transition-all">
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                            <input
                                type="text"
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="e.g. Innovation"
                                required
                            />
                        </div>

                        <div>
                            <div className="flex justify-between mb-1">
                                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description *</label>
                                <span className={`text-xs ${description.length > 100 ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                                    {description.length} / 100
                                </span>
                            </div>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                maxLength={100}
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${description.length >= 100 ? 'border-amber-300' : 'border-gray-300'}`}
                                placeholder="Briefly describe this core value..."
                                required
                            />
                        </div>

                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || isUploading || description.length > 100}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                        >
                            {(isLoading || isUploading) ? (
                                <><LogoLoader className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                            ) : 'Add Core Value'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
