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

                            const toastId = toast.loading('Uploading media...');
                            try {
                                const formData = new FormData();
                                formData.append('file', file);
                                
                                const existingUrl = isVideo ? selectedElement.data?.videoUrl : selectedElement.data?.imageUrl;
                                if (existingUrl) {
                                    formData.append('replaceUrl', existingUrl);
                                }
                                
                                const endpoint = isVideo ? '/api/files/upload-video' : '/api/files/upload';
                                const res = await api.post(endpoint, formData, {
                                    headers: { 'Content-Type': 'multipart/form-data' }
                                });

                                if (res.data.url) {
                                    if (isVideo) {
                                        onUpdate('data.videoUrl', res.data.url);
                                        onUpdate('data.imageUrl', ''); // Clear other
                                    } else {
                                        onUpdate('data.imageUrl', res.data.url);
                                        onUpdate('data.videoUrl', ''); // Clear other
                                    }
                                    toast.success('Upload complete', { id: toastId });
                                } else {
                                    toast.error('Upload failed', { id: toastId });
                                }
                            } catch (err) {
                                console.error(err);
                                toast.error('Upload failed', { id: toastId });
                            }
                            e.target.value = ''; // Reset
                        }}
                    />
                </label>
            </div>
            
            <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Or Media URL</label>
                <input 
                    type="text" 
                    value={selectedElement.data?.imageUrl || selectedElement.data?.videoUrl || ''} 
                    onChange={(e) => {
                        const val = e.target.value;
                        const isVid = val.endsWith('.mp4') || val.endsWith('.m3u8') || val.endsWith('.webm');
                        if(isVid) {
                            onUpdate('data.videoUrl', val);
                            onUpdate('data.imageUrl', '');
                        } else {
                            onUpdate('data.imageUrl', val);
                            onUpdate('data.videoUrl', '');
                        }
                    }}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="https://..."
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
