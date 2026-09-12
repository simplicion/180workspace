"use client";

import { LogoLoader } from "@workspace/ui";
import React, { useState, useRef } from 'react';
import { X, Upload, Image as ImageIcon, Trash2, CheckCircle2, AlertCircle, Plus, FileImage } from 'lucide-react';
import { useAddCompanyMediaMutation } from '@/redux/api/companyApi';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface UploadMediaModalProps {
    isOpen: boolean;
    onClose: () => void;
    companyId: string;
    onMediaUploaded?: () => void;
}

interface QueuedFile {
    id: string;
    file: File;
    previewUrl: string;
    status: 'pending' | 'uploading' | 'success' | 'error';
    error?: string;
    uploadedUrl?: string;
}

const MAX_FILES = 10;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export function UploadMediaModal({ isOpen, onClose, companyId, onMediaUploaded }: UploadMediaModalProps) {
    const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [overallProgress, setOverallProgress] = useState<string>('');
    const [generalError, setGeneralError] = useState<string>('');
    const [isDragging, setIsDragging] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [addMedia] = useAddCompanyMediaMutation();

    if (!isOpen) return null;

    const handleFilesSelected = (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setGeneralError('');

        const newFiles: File[] = Array.from(files);

        // Check if combined total exceeds MAX_FILES
        if (queuedFiles.length + newFiles.length > MAX_FILES) {
            setGeneralError(`Maximum ${MAX_FILES} photos can be uploaded at a time. (You currently have ${queuedFiles.length} selected).`);
            toast.error(`Maximum ${MAX_FILES} photos allowed per batch.`);
            return;
        }

        const validQueued: QueuedFile[] = [];
        const errors: string[] = [];

        newFiles.forEach((file) => {
            // Check file type
            if (!file.type.startsWith('image/')) {
                errors.push(`"${file.name}" is not a valid image format.`);
                return;
            }

            // Check file size (5MB limit)
            if (file.size > MAX_FILE_SIZE_BYTES) {
                errors.push(`"${file.name}" exceeds 5MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
                return;
            }

            const previewUrl = URL.createObjectURL(file);
            validQueued.push({
                id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                file,
                previewUrl,
                status: 'pending'
            });
        });

        if (errors.length > 0) {
            setGeneralError(errors.join(' '));
            toast.error(errors[0]);
        }

        if (validQueued.length > 0) {
            setQueuedFiles(prev => [...prev, ...validQueued]);
        }

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleRemoveQueued = (id: string) => {
        setQueuedFiles(prev => {
            const item = prev.find(f => f.id === id);
            if (item) URL.revokeObjectURL(item.previewUrl);
            return prev.filter(f => f.id !== id);
        });
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files) {
            handleFilesSelected(e.dataTransfer.files);
        }
    };

    const handleStartUpload = async () => {
        if (queuedFiles.length === 0) return;
        setIsUploading(true);
        setGeneralError('');

        const successfulUrls: string[] = [];
        let successCount = 0;

        for (let i = 0; i < queuedFiles.length; i++) {
            const currentItem = queuedFiles[i];
            setOverallProgress(`Uploading ${i + 1} of ${queuedFiles.length}...`);

            // Update status of current item to uploading
            setQueuedFiles(prev => prev.map(f => f.id === currentItem.id ? { ...f, status: 'uploading' } : f));

            const formData = new FormData();
            formData.append('file', currentItem.file);

            try {
                const response = await api.post('/api/branding/logo', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                if (response.data?.url) {
                    successfulUrls.push(response.data.url);
                    successCount++;
                    setQueuedFiles(prev => prev.map(f => f.id === currentItem.id ? { ...f, status: 'success', uploadedUrl: response.data.url } : f));
                } else {
                    setQueuedFiles(prev => prev.map(f => f.id === currentItem.id ? { ...f, status: 'error', error: 'Upload failed' } : f));
                }
            } catch (err: any) {
                console.error('File upload error:', err);
                const msg = err.response?.data?.message || 'Upload failed';
                setQueuedFiles(prev => prev.map(f => f.id === currentItem.id ? { ...f, status: 'error', error: msg } : f));
            }
        }

        // Save successfully uploaded images to Company Media in batch
        if (successfulUrls.length > 0) {
            try {
                await addMedia({
                    companyId,
                    imageUrls: successfulUrls,
                    imageUrl: successfulUrls[0]
                }).unwrap();

                toast.success(`Successfully uploaded ${successfulUrls.length} photo${successfulUrls.length > 1 ? 's' : ''} to Gallery!`);
                if (onMediaUploaded) onMediaUploaded();

                // Clean up object URLs
                queuedFiles.forEach(f => URL.revokeObjectURL(f.previewUrl));
                onClose();
            } catch (saveErr: any) {
                console.error('Failed to link media to company profile:', saveErr);
                toast.error('Photos uploaded, but failed to link to gallery database.');
            }
        } else {
            toast.error('Failed to upload any photos.');
        }

        setIsUploading(false);
        setOverallProgress('');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div>
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center">
                            <ImageIcon className="w-5 h-5 mr-2 text-blue-600" />
                            Upload Media Photos
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Upload up to {MAX_FILES} photos (Max 5MB each). Supported: PNG, JPG, JPEG, WEBP.
                        </p>
                    </div>
                    <button 
                        onClick={onClose} 
                        disabled={isUploading}
                        className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                    {generalError && (
                        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm rounded-xl flex items-start space-x-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                            <span>{generalError}</span>
                        </div>
                    )}

                    {/* Drag & Drop Zone */}
                    {queuedFiles.length < MAX_FILES && (
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`flex flex-col items-center justify-center p-6 sm:p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                                isDragging 
                                    ? 'border-blue-500 bg-blue-50/60 scale-[1.01]' 
                                    : 'border-gray-300 bg-gray-50/60 hover:bg-gray-100/80 hover:border-gray-400'
                            }`}
                        >
                            <input 
                                ref={fileInputRef}
                                type="file" 
                                className="hidden" 
                                multiple
                                accept="image/png, image/jpeg, image/jpg, image/webp" 
                                onChange={(e) => handleFilesSelected(e.target.files)} 
                                disabled={isUploading} 
                            />
                            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm mb-3 group-hover:scale-110 transition-transform">
                                <Upload className="w-6 h-6" />
                            </div>
                            <p className="text-sm font-semibold text-gray-800 text-center">
                                Click to browse or drag & drop multiple photos
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                {queuedFiles.length > 0 
                                    ? `${queuedFiles.length} of ${MAX_FILES} selected. You can add ${MAX_FILES - queuedFiles.length} more.` 
                                    : `Select up to ${MAX_FILES} images simultaneously (max 5MB each)`}
                            </p>
                        </div>
                    )}

                    {/* Selected Photos Preview Grid */}
                    {queuedFiles.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center">
                                    <FileImage className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                                    Selected Photos ({queuedFiles.length}/{MAX_FILES})
                                </h4>
                                {!isUploading && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            queuedFiles.forEach(f => URL.revokeObjectURL(f.previewUrl));
                                            setQueuedFiles([]);
                                        }}
                                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                                    >
                                        Clear All
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {queuedFiles.map((item) => (
                                    <div 
                                        key={item.id} 
                                        className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-100 group shadow-sm"
                                    >
                                        <img 
                                            src={item.previewUrl} 
                                            alt={item.file.name} 
                                            className="w-full h-full object-cover" 
                                        />

                                        {/* Status Overlays */}
                                        {item.status === 'uploading' && (
                                            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center p-2 text-white">
                                                <LogoLoader className="w-6 h-6 animate-spin text-white mb-1" />
                                                <span className="text-[10px] font-medium">Uploading...</span>
                                            </div>
                                        )}

                                        {item.status === 'success' && (
                                            <div className="absolute inset-0 bg-green-900/40 flex items-center justify-center">
                                                <CheckCircle2 className="w-8 h-8 text-white drop-shadow-md" />
                                            </div>
                                        )}

                                        {item.status === 'error' && (
                                            <div className="absolute inset-0 bg-red-900/60 flex flex-col items-center justify-center p-1 text-white text-center">
                                                <AlertCircle className="w-6 h-6 text-red-200 mb-1" />
                                                <span className="text-[9px] font-medium text-red-100 leading-tight">{item.error || 'Failed'}</span>
                                            </div>
                                        )}

                                        {/* Remove Button (only when pending) */}
                                        {!isUploading && item.status === 'pending' && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveQueued(item.id)}
                                                className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors shadow-md opacity-90 group-hover:opacity-100"
                                                title="Remove"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}

                                        {/* File Size Badge */}
                                        <div className="absolute bottom-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[9px] text-white font-medium backdrop-blur-xs">
                                            {(item.file.size / (1024 * 1024)).toFixed(1)} MB
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between sticky bottom-0">
                    <div className="text-xs text-gray-500 font-medium">
                        {isUploading ? overallProgress : `${queuedFiles.length} photo${queuedFiles.length === 1 ? '' : 's'} ready`}
                    </div>

                    <div className="flex items-center space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isUploading}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleStartUpload}
                            disabled={isUploading || queuedFiles.length === 0}
                            className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isUploading ? (
                                <>
                                    <LogoLoader className="w-4 h-4 mr-2 animate-spin text-white" />
                                    <span>Uploading ({queuedFiles.length})...</span>
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4 mr-2" />
                                    <span>Upload {queuedFiles.length > 0 ? `(${queuedFiles.length})` : ''}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
