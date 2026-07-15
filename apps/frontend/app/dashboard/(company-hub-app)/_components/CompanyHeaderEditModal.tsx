"use client";

import React, { useState } from 'react';
import { X, Upload, Save, Loader2, Image as ImageIcon } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface CompanyHeaderEditModalProps {
    company: any;
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
}

export function CompanyHeaderEditModal({ company, isOpen, onClose, onSave }: CompanyHeaderEditModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [uploadingField, setUploadingField] = useState<'bannerUrl' | 'logoUrl' | null>(null);

    const [formData, setFormData] = useState({
        name: company.name || '',
        oneLineDescription: company.oneLineDescription || '',
        headquarters: company.headquarters || '',
        website: company.website || '',
        foundedDate: company.foundedDate ? new Date(company.foundedDate).toISOString().split('T')[0] : '',
        bannerUrl: company.bannerUrl || '',
        logoUrl: company.logoUrl || ''
    });

    React.useEffect(() => {
        if (isOpen && company) {
            setFormData({
                name: company.name || '',
                oneLineDescription: company.oneLineDescription || '',
                headquarters: company.headquarters || '',
                website: company.website || '',
                foundedDate: company.foundedDate ? new Date(company.foundedDate).toISOString().split('T')[0] : '',
                bannerUrl: company.bannerUrl || '',
                logoUrl: company.logoUrl || ''
            });
        }
    }, [isOpen, company]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'bannerUrl' | 'logoUrl') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingField(field);
        const data = new FormData();
        data.append('file', file);

        try {
            const res = await api.post('/api/branding/logo', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setFormData(prev => ({ ...prev, [field]: res.data.url }));
            toast.success('Image uploaded successfully');
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Upload failed');
        } finally {
            setUploadingField(null);
            // Reset the input value so the same file can be uploaded again if needed
            e.target.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const dataToSave = {
                ...formData
            };
            await onSave(dataToSave);
            onClose();
        } catch (error) {
            console.error('Failed to save header data', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            
            {/* Modal */}
            <div className="relative bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl shadow-xl flex flex-col animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8 sm:zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">Edit Company Profile</h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                    <form id="header-edit-form" onSubmit={handleSubmit} className="space-y-6">
                        {/* Images Section */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Images</h3>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Banner Image URL (16:9)</label>
                                <div className="flex space-x-2">
                                    <input type="text" name="bannerUrl" value={formData.bannerUrl} onChange={handleChange} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" placeholder="https://..." />
                                    <label className={`flex flex-col items-center justify-center px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors ${uploadingField === 'bannerUrl' ? 'opacity-70 pointer-events-none' : ''}`}>
                                        {uploadingField === 'bannerUrl' ? <Loader2 className="h-4 w-4 animate-spin text-gray-600" /> : <Upload className="h-4 w-4 text-gray-600" />}
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'bannerUrl')} disabled={!!uploadingField} />
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL (Square)</label>
                                <div className="flex space-x-2">
                                    <input type="text" name="logoUrl" value={formData.logoUrl} onChange={handleChange} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" placeholder="https://..." />
                                    <label className={`flex flex-col items-center justify-center px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors ${uploadingField === 'logoUrl' ? 'opacity-70 pointer-events-none' : ''}`}>
                                        {uploadingField === 'logoUrl' ? <Loader2 className="h-4 w-4 animate-spin text-gray-600" /> : <Upload className="h-4 w-4 text-gray-600" />}
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logoUrl')} disabled={!!uploadingField} />
                                    </label>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Logo will be automatically adapted to a circle in the profile view.</p>
                            </div>
                        </div>

                        {/* Basic Info */}
                        <div className="space-y-4 pt-4 border-t border-gray-100">
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Basic Info</h3>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                                <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" required />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">One Line Description / Title</label>
                                <input type="text" name="oneLineDescription" value={formData.oneLineDescription} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Location (Headquarters)</label>
                                    <input type="text" name="headquarters" value={formData.headquarters} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Domain / Website</label>
                                    <input type="text" name="website" value={formData.website} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Founded Date</label>
                                <input type="date" name="foundedDate" value={formData.foundedDate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
                            </div>
                        </div>
                    </form>
                </div>

                <div className="p-4 sm:p-6 border-t border-gray-100 flex items-center justify-end space-x-3 bg-gray-50 rounded-b-2xl">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        Cancel
                    </button>
                    <button type="submit" form="header-edit-form" disabled={isLoading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center disabled:opacity-70 disabled:cursor-not-allowed">
                        {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
