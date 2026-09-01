import React from 'react';
import { Upload } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Props {
    selectedElement: any;
    onUpdate: (key: string, value: any) => void;
    website?: any;
}

export default function ImageProperties({ selectedElement, onUpdate, website }: Props) {
    if (selectedElement.type !== 'media' && selectedElement.type !== 'image') return null;

    return (
        <div className="space-y-4 pt-4 border-t border-gray-100">
            <h4 className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-2">Media Upload</h4>

            <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 flex justify-between">
                    Upload File
                    <span className="text-[10px] text-gray-400 font-normal">Img max 5MB / Vid max 50MB</span>
                </label>
                
                <label 
                    onDragOver={(e) => {
                        if (e.dataTransfer.types.includes('application/vnd.builder.media.url')) {
                            e.preventDefault();
                            e.stopPropagation();
                        }
                    }}
                    onDrop={(e) => {
                        const mediaUrl = e.dataTransfer.getData('application/vnd.builder.media.url');
                        if (mediaUrl) {
                            e.preventDefault();
                            e.stopPropagation();
                            const isVid = mediaUrl.endsWith('.mp4') || mediaUrl.endsWith('.m3u8') || mediaUrl.endsWith('.webm');
                            if (isVid) {
                                onUpdate('data.videoUrl', mediaUrl);
                                onUpdate('data.imageUrl', '');
                            } else {
                                onUpdate('data.imageUrl', mediaUrl);
                                onUpdate('data.videoUrl', '');
                            }
                            toast.success('Media applied');
                        }
                    }}
                    className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:text-indigo-600 hover:border-indigo-500 cursor-pointer transition-colors"
                >
                    <Upload className="w-6 h-6 mb-2" />
                    <span className="text-xs font-medium">Click or Drop Media Here</span>
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
                            } else if (!isVideo && file.size > 10 * 1024 * 1024) {
                                toast.error('Image size must be less than 10MB');
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
                                if (website?.id) {
                                    formData.append('relatedId', website.id);
                                    formData.append('relatedModel', 'Website');
                                }
                                
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

            <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Media URL</label>
                <input 
                    type="text" 
                    value={selectedElement.data?.imageUrl || selectedElement.data?.videoUrl || ''} 
                    onChange={(e) => {
                        const val = e.target.value;
                        const isVid = val.endsWith('.mp4') || val.endsWith('.m3u8') || val.endsWith('.webm');
                        if (isVid) {
                            onUpdate('data.videoUrl', val);
                            onUpdate('data.imageUrl', '');
                        } else {
                            onUpdate('data.imageUrl', val);
                            onUpdate('data.videoUrl', '');
                        }
                    }}
                    placeholder="https://..."
                    className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
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

            <div className="pt-4 border-t border-gray-100 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-2">Border</h4>
                <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 flex justify-between">
                        <span>Border Width</span>
                        <span className="text-indigo-600">{selectedElement.style?.borderWidth || '0px'}</span>
                    </label>
                    <input 
                        type="range" 
                        min="0" max="20" step="1" 
                        value={selectedElement.style?.borderWidth ? parseInt(selectedElement.style.borderWidth) : 0} 
                        onChange={(e) => {
                            onUpdate('style.borderWidth', `${e.target.value}px`);
                            if (parseInt(e.target.value) > 0 && !selectedElement.style?.borderStyle) {
                                onUpdate('style.borderStyle', 'solid');
                            }
                        }}
                        className="w-full accent-indigo-600"
                    />
                </div>
                <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Border Style</label>
                    <select 
                        value={selectedElement.style?.borderStyle || 'solid'} 
                        onChange={(e: any) => {
                            onUpdate('style.borderStyle', e.target.value);
                            if (!selectedElement.style?.borderWidth || parseInt(selectedElement.style.borderWidth) === 0) {
                                onUpdate('style.borderWidth', '1px');
                            }
                        }}
                        className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                        <option value="solid">Solid</option>
                        <option value="dashed">Dashed</option>
                        <option value="dotted">Dotted</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Border Color</label>
                    <div className="flex items-center gap-2">
                        <input 
                            type="color" 
                            value={selectedElement.style?.borderColor || '#000000'} 
                            onChange={(e) => {
                                onUpdate('style.borderColor', e.target.value);
                                if (!selectedElement.style?.borderWidth || parseInt(selectedElement.style.borderWidth) === 0) {
                                    onUpdate('style.borderWidth', '1px');
                                }
                                if (!selectedElement.style?.borderStyle) {
                                    onUpdate('style.borderStyle', 'solid');
                                }
                            }}
                            className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200 p-0 shadow-sm"
                        />
                        <input 
                            type="text" 
                            value={selectedElement.style?.borderColor || '#000000'} 
                            onChange={(e) => {
                                onUpdate('style.borderColor', e.target.value);
                                if (!selectedElement.style?.borderWidth || parseInt(selectedElement.style.borderWidth) === 0) {
                                    onUpdate('style.borderWidth', '1px');
                                }
                                if (!selectedElement.style?.borderStyle) {
                                    onUpdate('style.borderStyle', 'solid');
                                }
                            }}
                            className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none font-mono uppercase"
                        />
                    </div>
                </div>
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
