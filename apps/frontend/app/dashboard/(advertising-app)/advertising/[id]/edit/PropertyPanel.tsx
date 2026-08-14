import { Settings, X, Image as ImageIcon, Video, Upload, Trash2, Plus } from 'lucide-react';
import { useState, useRef } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface PropertyPanelProps {
    selectedElement: any;
    onUpdate: (key: string, value: any) => void;
    onClose: () => void;
}

export default function PropertyPanel({ selectedElement, onUpdate, onClose }: PropertyPanelProps) {
    if (!selectedElement) return null;

    const isHeader = selectedElement.type === 'header';
    const isFooter = selectedElement.type === 'footer';

    return (
        <div className="h-full flex flex-col bg-white">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80 backdrop-blur">
                <h3 className="font-bold flex items-center gap-2 text-sm text-gray-700 capitalize">
                    <Settings className="w-4 h-4 text-indigo-500" />
                    {selectedElement.type} Editor
                </h3>
                <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-md text-gray-400 hover:text-gray-600 transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                
                {/* Background Section */}
                {!(isHeader || isFooter) && (
                <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Background</h4>
                    <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Color</label>
                        <div className="flex items-center gap-2">
                            <input 
                                type="color" 
                                value={selectedElement.style?.backgroundColor || '#ffffff'} 
                                onChange={(e) => onUpdate('style.backgroundColor', e.target.value)}
                                className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200 p-0 shadow-sm"
                            />
                            <input 
                                type="text" 
                                value={selectedElement.style?.backgroundColor || '#ffffff'} 
                                onChange={(e) => onUpdate('style.backgroundColor', e.target.value)}
                                className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none uppercase font-mono"
                            />
                        </div>
                    </div>
                </div>
                )}

                {/* Spacing Section */}
                <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Spacing</h4>
                    <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1.5 flex justify-between">
                            <span>Padding Top (rem)</span>
                            <span className="text-indigo-600">{selectedElement.style?.paddingTop !== undefined ? selectedElement.style.paddingTop : (selectedElement.style?.paddingY || 0)}</span>
                        </label>
                        <input 
                            type="range" 
                            min="0" max="15" step="0.5" 
                            value={selectedElement.style?.paddingTop !== undefined ? selectedElement.style.paddingTop : (selectedElement.style?.paddingY || 0)} 
                            onChange={(e) => onUpdate('style.paddingTop', parseFloat(e.target.value))}
                            className="w-full accent-indigo-600"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1.5 flex justify-between">
                            <span>Padding Bottom (rem)</span>
                            <span className="text-indigo-600">{selectedElement.style?.paddingBottom !== undefined ? selectedElement.style.paddingBottom : (selectedElement.style?.paddingY || 0)}</span>
                        </label>
                        <input 
                            type="range" 
                            min="0" max="15" step="0.5" 
                            value={selectedElement.style?.paddingBottom !== undefined ? selectedElement.style.paddingBottom : (selectedElement.style?.paddingY || 0)} 
                            onChange={(e) => onUpdate('style.paddingBottom', parseFloat(e.target.value))}
                            className="w-full accent-indigo-600"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1.5 flex justify-between">
                            <span>Padding Left (rem)</span>
                            <span className="text-indigo-600">{selectedElement.style?.paddingLeft !== undefined ? selectedElement.style.paddingLeft : (selectedElement.style?.paddingX || 0)}</span>
                        </label>
                        <input 
                            type="range" 
                            min="0" max="15" step="0.5" 
                            value={selectedElement.style?.paddingLeft !== undefined ? selectedElement.style.paddingLeft : (selectedElement.style?.paddingX || 0)} 
                            onChange={(e) => onUpdate('style.paddingLeft', parseFloat(e.target.value))}
                            className="w-full accent-indigo-600"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1.5 flex justify-between">
                            <span>Padding Right (rem)</span>
                            <span className="text-indigo-600">{selectedElement.style?.paddingRight !== undefined ? selectedElement.style.paddingRight : (selectedElement.style?.paddingX || 0)}</span>
                        </label>
                        <input 
                            type="range" 
                            min="0" max="15" step="0.5" 
                            value={selectedElement.style?.paddingRight !== undefined ? selectedElement.style.paddingRight : (selectedElement.style?.paddingX || 0)} 
                            onChange={(e) => onUpdate('style.paddingRight', parseFloat(e.target.value))}
                            className="w-full accent-indigo-600"
                        />
                    </div>
                </div>

                {/* Appearance Section */}
                {!isHeader && !isFooter && (
                    <div className="space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Appearance</h4>
                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1.5 flex justify-between">
                                <span>Opacity</span>
                                <span className="text-indigo-600">{selectedElement.style?.opacity ?? 1}</span>
                            </label>
                            <input 
                                type="range" 
                                min="0" max="1" step="0.1" 
                                value={selectedElement.style?.opacity ?? 1} 
                                onChange={(e) => onUpdate('style.opacity', parseFloat(e.target.value))}
                                className="w-full accent-indigo-600"
                            />
                        </div>
                    </div>
                )}
                
                {/* Box Settings */}
                {selectedElement.type === 'box' && (
                    <div className="space-y-4 pt-4 border-t border-gray-100">
                        <h4 className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-2">Flex Layout</h4>
                        
                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Direction</label>
                            <select 
                                value={selectedElement.style?.flexDirection || 'column'} 
                                onChange={(e) => onUpdate('style.flexDirection', e.target.value)}
                                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="column">Vertical (Column)</option>
                                <option value="row">Horizontal (Row)</option>
                            </select>
                        </div>
                        
                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Wrap</label>
                            <select 
                                value={selectedElement.style?.flexWrap || 'nowrap'} 
                                onChange={(e) => onUpdate('style.flexWrap', e.target.value)}
                                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="nowrap">No Wrap</option>
                                <option value="wrap">Wrap</option>
                            </select>
                        </div>
                        
                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1.5 flex justify-between">
                                <span>Gap (rem)</span>
                                <span className="text-indigo-600">{selectedElement.style?.gap ? parseFloat(selectedElement.style.gap) : 1}</span>
                            </label>
                            <input 
                                type="range" 
                                min="0" max="10" step="0.25" 
                                value={selectedElement.style?.gap ? parseFloat(selectedElement.style.gap) : 1} 
                                onChange={(e) => onUpdate('style.gap', `${e.target.value}rem`)}
                                className="w-full accent-indigo-600"
                            />
                        </div>
                        
                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Align Items (Cross Axis)</label>
                            <select 
                                value={selectedElement.style?.alignItems || 'stretch'} 
                                onChange={(e) => onUpdate('style.alignItems', e.target.value)}
                                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="flex-start">Start</option>
                                <option value="center">Center</option>
                                <option value="flex-end">End</option>
                                <option value="stretch">Stretch</option>
                            </select>
                        </div>
                        
                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Justify Content (Main Axis)</label>
                            <select 
                                value={selectedElement.style?.justifyContent || 'flex-start'} 
                                onChange={(e) => onUpdate('style.justifyContent', e.target.value)}
                                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="flex-start">Start</option>
                                <option value="center">Center</option>
                                <option value="flex-end">End</option>
                                <option value="space-between">Space Between</option>
                            </select>
                        </div>

                        {/* Box Border */}
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
                                    onChange={(e) => onUpdate('style.borderWidth', `${e.target.value}px`)}
                                    className="w-full accent-indigo-600"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Border Style</label>
                                <select 
                                    value={selectedElement.style?.borderStyle || 'solid'} 
                                    onChange={(e) => onUpdate('style.borderStyle', e.target.value)}
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
                                        onChange={(e) => onUpdate('style.borderColor', e.target.value)}
                                        className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200 p-0 shadow-sm"
                                    />
                                    <input 
                                        type="text" 
                                        value={selectedElement.style?.borderColor || '#000000'} 
                                        onChange={(e) => onUpdate('style.borderColor', e.target.value)}
                                        className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none font-mono uppercase"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1.5 flex justify-between">
                                    <span>Border Radius</span>
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
                    </div>
                )}

                {/* Media Settings */}
                {selectedElement.type === 'media' && (
                    <div className="space-y-4 pt-4 border-t border-gray-100">
                        <h4 className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-2">Media Upload</h4>

                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1.5 block flex justify-between">
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
                                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                placeholder="https://example.com/media.png"
                            />
                        </div>

                        <div>
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
                        
                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1.5 flex justify-between">
                                <span>Image/Video Padding</span>
                                <span className="text-indigo-600">{selectedElement.style?.padding || '0px'}</span>
                            </label>
                            <input 
                                type="range" 
                                min="0" max="100" step="1" 
                                value={selectedElement.style?.padding ? parseInt(selectedElement.style.padding) : 0} 
                                onChange={(e) => onUpdate('style.padding', `${e.target.value}px`)}
                                className="w-full accent-indigo-600"
                            />
                        </div>
                    </div>
                )}

                {/* Line Settings */}
                {selectedElement.type === 'line' && (
                    <div className="space-y-4 pt-4 border-t border-gray-100">
                        <h4 className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-2">Line Settings</h4>
                        
                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Direction</label>
                            <select 
                                value={selectedElement.style?.direction || 'horizontal'} 
                                onChange={(e) => onUpdate('style.direction', e.target.value)}
                                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="horizontal">Horizontal</option>
                                <option value="vertical">Vertical</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1.5 flex justify-between">
                                <span>Thickness</span>
                                <span className="text-indigo-600">{selectedElement.style?.thickness || '2px'}</span>
                            </label>
                            <input 
                                type="range" 
                                min="1" max="20" step="1" 
                                value={selectedElement.style?.thickness ? parseInt(selectedElement.style.thickness) : 2} 
                                onChange={(e) => onUpdate('style.thickness', `${e.target.value}px`)}
                                className="w-full accent-indigo-600"
                            />
                        </div>
                    </div>
                )}

                {/* Button Settings */}
                {selectedElement.type === 'button' && (
                    <div className="space-y-4 pt-4 border-t border-gray-100">
                        <h4 className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-2">Button Settings</h4>
                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Button Text</label>
                            <input 
                                type="text" 
                                value={selectedElement.data?.content || ''} 
                                onChange={(e) => onUpdate('data.content', e.target.value)}
                                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="Click Me"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Link URL</label>
                            <input 
                                type="text" 
                                value={selectedElement.data?.link || ''} 
                                onChange={(e) => onUpdate('data.link', e.target.value)}
                                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="https://..."
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Text Color</label>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="color" 
                                    value={selectedElement.style?.color || '#ffffff'} 
                                    onChange={(e) => onUpdate('style.color', e.target.value)}
                                    className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200 p-0 shadow-sm"
                                />
                                <input 
                                    type="text" 
                                    value={selectedElement.style?.color || '#ffffff'} 
                                    onChange={(e) => onUpdate('style.color', e.target.value)}
                                    className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none uppercase font-mono"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1.5 flex justify-between">
                                <span>Corner Radius</span>
                                <span className="text-indigo-600">{selectedElement.style?.borderRadius || '0.5rem'}</span>
                            </label>
                            <input 
                                type="range" 
                                min="0" max="150" step="1" 
                                value={selectedElement.style?.borderRadius ? parseInt(selectedElement.style.borderRadius) : 8} 
                                onChange={(e) => onUpdate('style.borderRadius', `${e.target.value}px`)}
                                className="w-full accent-indigo-600"
                            />
                        </div>
                    </div>
                )}

                {/* Text Settings */}
                {selectedElement.type === 'text' && (
                    <div className="space-y-4 pt-4 border-t border-gray-100">
                        <h4 className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-2">Text Settings</h4>
                        
                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Tag</label>
                            <select 
                                value={selectedElement.style?.tagName || 'div'} 
                                onChange={(e) => onUpdate('style.tagName', e.target.value)}
                                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="h1">Heading 1 (h1)</option>
                                <option value="h2">Heading 2 (h2)</option>
                                <option value="h3">Heading 3 (h3)</option>
                                <option value="h4">Heading 4 (h4)</option>
                                <option value="p">Paragraph (p)</option>
                                <option value="div">Div Block</option>
                                <option value="span">Inline Span</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Font Size</label>
                            <select 
                                value={selectedElement.style?.fontSize || '1rem'} 
                                onChange={(e) => onUpdate('style.fontSize', e.target.value)}
                                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="0.75rem">XS (0.75rem)</option>
                                <option value="0.875rem">SM (0.875rem)</option>
                                <option value="1rem">Base (1rem)</option>
                                <option value="1.125rem">LG (1.125rem)</option>
                                <option value="1.25rem">XL (1.25rem)</option>
                                <option value="1.5rem">2XL (1.5rem)</option>
                                <option value="2.25rem">4XL (2.25rem)</option>
                                <option value="3rem">5XL (3rem)</option>
                                <option value="4.5rem">7XL (4.5rem)</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Font Weight</label>
                            <select 
                                value={selectedElement.style?.fontWeight || '400'} 
                                onChange={(e) => onUpdate('style.fontWeight', e.target.value)}
                                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="300">Light</option>
                                <option value="400">Normal</option>
                                <option value="500">Medium</option>
                                <option value="600">Semi Bold</option>
                                <option value="700">Bold</option>
                                <option value="800">Extra Bold</option>
                                <option value="900">Black</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Text Align</label>
                            <select 
                                value={selectedElement.style?.textAlign || 'left'} 
                                onChange={(e) => onUpdate('style.textAlign', e.target.value)}
                                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="left">Left</option>
                                <option value="center">Center</option>
                                <option value="right">Right</option>
                                <option value="justify">Justify</option>
                            </select>
                        </div>
                        
                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Text Color</label>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="color" 
                                    value={selectedElement.style?.color || '#000000'} 
                                    onChange={(e) => onUpdate('style.color', e.target.value)}
                                    className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200 p-0 shadow-sm"
                                />
                                <input 
                                    type="text" 
                                    value={selectedElement.style?.color || '#000000'} 
                                    onChange={(e) => onUpdate('style.color', e.target.value)}
                                    className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none font-mono uppercase"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
