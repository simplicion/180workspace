import { LogoLoader } from "@workspace/ui";
import React, { useState } from 'react';
import { Plus, MoreVertical, Trash2 } from 'lucide-react';
import { UploadMediaModal } from './UploadMediaModal';
import { useDeleteCompanyMediaMutation } from '@/redux/api/companyApi';

interface TabProps {
    company: any;
    isOwner?: boolean;
    onProfileUpdate?: () => void;
}

export function MediaTab({ company, isOwner = true, onProfileUpdate }: TabProps) {
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [deleteMedia, { isLoading: isDeleting }] = useDeleteCompanyMediaMutation();
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

    const media = company.media || [];

    const handleDelete = async (id: string) => {
        try {
            setDeletingId(id);
            await deleteMedia(id).unwrap();
            setActiveDropdown(null);
            if (onProfileUpdate) {
                onProfileUpdate();
            }
        } catch (error) {
            console.error('Failed to delete media', error);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {isUploadModalOpen && (
                <UploadMediaModal 
                    isOpen={isUploadModalOpen} 
                    onClose={() => setIsUploadModalOpen(false)} 
                    companyId={company.id} 
                    onMediaUploaded={() => {
                        if (onProfileUpdate) onProfileUpdate();
                    }}
                />
            )}
            
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Media Gallery</h3>
                {isOwner && (
                    <button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Upload Photo
                    </button>
                )}
            </div>
            
            {media.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {media.map((item: any) => (
                        <div key={item.id} className="aspect-square bg-gray-200 rounded-2xl overflow-hidden shadow-sm group relative">
                            <img src={item.imageUrl} alt="Gallery item" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            
                            {isOwner && (
                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="relative">
                                        <button 
                                            onClick={() => setActiveDropdown(activeDropdown === item.id ? null : item.id)}
                                            className="p-1.5 bg-white/90 backdrop-blur rounded-lg shadow-sm hover:bg-white text-gray-700 transition-colors"
                                        >
                                            <MoreVertical className="w-5 h-5" />
                                        </button>
                                        
                                        {activeDropdown === item.id && (
                                            <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-100">
                                                <button 
                                                    onClick={() => handleDelete(item.id)}
                                                    disabled={isDeleting && deletingId === item.id}
                                                    className="w-full flex items-center px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                                                >
                                                    {isDeleting && deletingId === item.id ? (
                                                        <LogoLoader className="w-4 h-4 mr-2 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                    )}
                                                    Delete
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-12 flex flex-col items-center justify-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                        <img src="https://cdn-icons-png.flaticon.com/512/3342/3342137.png" alt="Empty" className="w-8 h-8 opacity-40" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 mb-1">No media yet</h4>
                    <p className="text-gray-500 text-sm max-w-sm text-center mb-6">Upload photos to showcase your workspace, team, and company culture.</p>
                    {isOwner && (
                        <button
                            onClick={() => setIsUploadModalOpen(true)}
                            className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                        >
                            Upload First Photo
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
