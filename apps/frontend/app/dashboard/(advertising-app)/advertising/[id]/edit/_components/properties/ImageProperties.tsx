import React from 'react';
import { Upload } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Props {
    selectedElement: any;
    onUpdate: (key: string, value: any) => void;
}

export default function ImageProperties({ selectedElement, onUpdate }: Props) {
    if (selectedElement.type !== 'media' && selectedElement.type !== 'image') return null;

    return (
        <div className="space-y-4 pt-4 border-t border-gray-100">
            <h4 className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-2">Media Upload</h4>

            <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 flex justify-between">
                    Upload File
                    <span className="text-[10px] text-gray-400 font-normal">Img max 5MB / Vid max 50MB</span>
                </label>
                
                <label className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:text-indigo-600 hover:border-indigo-500 cursor-pointer transition-colors">
                    <Upload className="w-6 h-6 mb-2" />
                    <span className="text-xs font-medium">Click to upload Media</span>
                    <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*,video/mp4,video/quicktime,video/webm"
                        onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            // Validation constraints
                            const isVideo = file.type.startsWith('video/');
                            if (isVideo && file.size > 50 * 1024 * 1024) {
                                toast.error('Video size must be less than 50MB');
                                return;
                            } else if (!isVideo && file.size > 5 * 1024 * 1024) {
                                toast.error('Image size must be less than 5MB');
                                return;
                            }

                            // Capture existing URL before optimistic update (ignore previous blobs)
                            const existingUrl = isVideo ? selectedElement.data?.videoUrl : selectedElement.data?.imageUrl;
                            
                            // Optimistic update for instant preview
                            const objectUrl = URL.createObjectURL(file);
                            if (isVideo) {
                                onUpdate('data.videoUrl', objectUrl);
                                onUpdate('data.imageUrl', ''); // Clear other
                            } else {
                                onUpdate('data.imageUrl', objectUrl);
                                onUpdate('data.videoUrl', ''); // Clear other
                            }

                            const toastId = toast.loading('Uploading media...');
                            try {
                                const formData = new FormData();
                                formData.append('file', file);
                                
                                if (existingUrl && !existingUrl.startsWith('blob:')) {
                                    formData.append('replaceUrl', existingUrl);
                                }
                                
                                const endpoint = isVideo ? '/api/v1/workspace-tools/storage/upload?streaming=true' : '/api/v1/workspace-tools/storage/upload';
                                const res = await api.post(endpoint, formData, {
                                    headers: { 'Content-Type': 'multipart/form-data' }
                                });

                                const url = res.data.url || res.data.fileUrl;
                                if (url) {
                                    if (isVideo) {
                                        onUpdate('data.videoUrl', url);
                                    } else {
                                        onUpdate('data.imageUrl', url);
                                    }
                                    toast.success('Upload complete', { id: toastId });
                                    URL.revokeObjectURL(objectUrl); // Clean up memory
                                } else {
                                    throw new Error('No URL returned');
                                }
                            } catch (err) {
                                console.error(err);
                                toast.error('Upload failed', { id: toastId });
                                // Revert to existing URL on failure
                                if (isVideo) {
                                    onUpdate('data.videoUrl', existingUrl || '');
                                } else {
                                    onUpdate('data.imageUrl', existingUrl || '');
                                }
                                URL.revokeObjectURL(objectUrl);
                            }
                            e.target.value = ''; // Reset
                        }}
                    />
                </label>
            </div>
            

            <div className="pt-2">
                <label className="text-xs font-semibold text-gray-600 mb-1.5 flex justify-between">
                    <span>Width (%)</span>
                    <span className="text-indigo-600">{selectedElement.style?.width || '100%'}</span>
                </label>
                <input 
                    type="range" 
                    min="10" max="100" step="5" 
                    value={selectedElement.style?.width ? parseInt(selectedElement.style.width) : 100} 
                    onChange={(e) => onUpdate('style.width', `${e.target.value}%`)}
                    className="w-full accent-indigo-600"
                />
            </div>

            <div className="pt-2">
                <label className="text-xs font-semibold text-gray-600 mb-1.5 flex justify-between">
                    <span>Corner Radius</span>
                    <span className="text-indigo-600">{selectedElement.style?.borderRadius || '0px'}</span>
                </label>
                <input 
                    type="range" 
                    min="0" max="150" step="1" 
                    value={selectedElement.style?.borderRadius ? parseInt(selectedElement.style.borderRadius) : 0} 
                    onChange={(e) => onUpdate('style.borderRadius', `${e.target.value}px`)}
                    className="w-full accent-indigo-600"
                />
            </div>
        </div>
    );
}
