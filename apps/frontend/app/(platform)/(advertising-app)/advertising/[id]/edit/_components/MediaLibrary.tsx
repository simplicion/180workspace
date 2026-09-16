'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { 
    Loader2, Trash2, Image as ImageIcon, Upload, Copy, Check, 
    ExternalLink, Film, Plus, RefreshCw, Layers
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface MediaItem {
    id: string;
    url: string;
    filename: string;
    source: 'in_use' | 'uploaded' | 'storage';
    isVideo?: boolean;
    size?: number;
    createdAt?: string;
    isBackendDoc?: boolean;
    docId?: string;
}

interface MediaLibraryProps {
    websiteId?: string;
    config?: any;
    onSelectMedia?: (url: string) => void;
}

// Helper to extract all images/videos currently in the website configuration
function extractMediaFromConfig(config: any): MediaItem[] {
    const results: MediaItem[] = [];
    const seenUrls = new Set<string>();

    const addUrl = (url: any, hintName?: string) => {
        if (!url || typeof url !== 'string') return;
        const cleanUrl = url.replace(/^url\(["']?/, '').replace(/["']?\)$/, '').trim();
        if (!cleanUrl || cleanUrl === 'none' || cleanUrl.startsWith('blob:') || cleanUrl.startsWith('data:')) return;
        if (seenUrls.has(cleanUrl)) return;
        seenUrls.add(cleanUrl);

        const urlParts = cleanUrl.split('/');
        const rawFilename = urlParts[urlParts.length - 1]?.split('?')[0] || 'media';
        const isVideo = cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.m3u8') || cleanUrl.endsWith('.webm') || cleanUrl.includes('/video/');

        results.push({
            id: `config-${results.length}-${Math.random().toString(36).substring(2, 6)}`,
            url: cleanUrl,
            filename: hintName || decodeURIComponent(rawFilename),
            source: 'in_use',
            isVideo,
            isBackendDoc: false
        });
    };

    if (!config) return results;

    // 1. Header logo & background
    if (config.header?.logo) addUrl(config.header.logo, 'Header Logo');
    if (config.header?.style?.backgroundImage) addUrl(config.header.style.backgroundImage, 'Header Background');

    // 2. Brand background / assets
    if (config.brand?.bgValue && config.brand.bgType === 'image') addUrl(config.brand.bgValue, 'Page Background');
    if (config.brand?.logo) addUrl(config.brand.logo, 'Brand Logo');

    // 3. Scan all nodes recursively
    const scanNode = (node: any) => {
        if (!node) return;
        if (node.data?.imageUrl) addUrl(node.data.imageUrl, node.data.alt || 'Page Image');
        if (node.data?.videoUrl) addUrl(node.data.videoUrl, 'Video');
        if (node.data?.src) addUrl(node.data.src, 'Image');
        if (node.style?.backgroundImage) addUrl(node.style.backgroundImage, 'Element Background');

        if (Array.isArray(node.data?.images)) {
            node.data.images.forEach((imgUrl: string, idx: number) => addUrl(imgUrl, `Carousel Image ${idx + 1}`));
        }
        if (Array.isArray(node.children)) {
            node.children.forEach(scanNode);
        }
    };

    if (Array.isArray(config.pages)) {
        config.pages.forEach((page: any) => {
            if (Array.isArray(page.sections)) {
                page.sections.forEach(scanNode);
            }
        });
    }

    if (Array.isArray(config.sections)) {
        config.sections.forEach(scanNode);
    }

    return results;
}

export default function MediaLibrary({ websiteId, config, onSelectMedia }: MediaLibraryProps) {
    const [storageFiles, setStorageFiles] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
    const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
    const [isDragOverDropzone, setIsDragOverDropzone] = useState(false);
    const [filterType, setFilterType] = useState<'all' | 'images' | 'videos'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Extract in-use media from config
    const configMedia = useMemo(() => extractMediaFromConfig(config), [config]);

    // Fetch files from backend storage associated with this website
    const fetchStorageFiles = async () => {
        if (!websiteId) return;
        try {
            setLoading(true);
            const res = await api.get(`/api/v1/workspace-tools/storage?relatedId=${websiteId}`);
            const docs = res.data?.documents || [];
            const mapped: MediaItem[] = docs.map((file: any) => {
                const isVideo = file.fileType?.startsWith('video/') || file.fileUrl?.endsWith('.mp4') || file.fileUrl?.endsWith('.m3u8');
                return {
                    id: file.id,
                    url: file.fileUrl,
                    filename: file.name || 'Uploaded File',
                    source: 'uploaded',
                    isVideo,
                    size: file.fileSize,
                    createdAt: file.createdAt,
                    isBackendDoc: true,
                    docId: file.id
                };
            });
            setStorageFiles(mapped);
        } catch (err) {
            console.error('Failed to fetch storage media', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStorageFiles();
    }, [websiteId]);

    // Combine and deduplicate media items
    const allMedia = useMemo(() => {
        const combined: MediaItem[] = [];
        const seenUrls = new Set<string>();

        // 1. First add backend uploaded files
        for (const item of storageFiles) {
            if (item.url && !seenUrls.has(item.url)) {
                seenUrls.add(item.url);
                combined.push(item);
            }
        }

        // 2. Then add in-use items from canvas that aren't already listed
        for (const item of configMedia) {
            if (item.url && !seenUrls.has(item.url)) {
                seenUrls.add(item.url);
                combined.push(item);
            }
        }

        return combined;
    }, [storageFiles, configMedia]);

    // Filter media items
    const filteredMedia = useMemo(() => {
        return allMedia.filter(item => {
            if (filterType === 'images' && item.isVideo) return false;
            if (filterType === 'videos' && !item.isVideo) return false;
            if (searchQuery.trim() && !item.filename.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
        });
    }, [allMedia, filterType, searchQuery]);

    // Handle bulk multi-file upload
    const handleFilesUpload = async (files: FileList | File[]) => {
        if (!files || files.length === 0) return;
        const fileArray = Array.from(files);

        setUploading(true);
        setUploadProgress({ current: 0, total: fileArray.length });

        let successCount = 0;
        const newUploadedItems: MediaItem[] = [];

        for (let i = 0; i < fileArray.length; i++) {
            const file = fileArray[i];
            setUploadProgress({ current: i + 1, total: fileArray.length });

            const isVideo = file.type.startsWith('video/');
            if (isVideo && file.size > 50 * 1024 * 1024) {
                toast.error(`${file.name}: Video must be under 50MB`);
                continue;
            } else if (!isVideo && file.size > 10 * 1024 * 1024) {
                toast.error(`${file.name}: Image must be under 10MB`);
                continue;
            }

            try {
                const formData = new FormData();
                formData.append('file', file);
                if (websiteId) {
                    formData.append('relatedId', websiteId);
                    formData.append('relatedModel', 'Website');
                }

                const endpoint = isVideo 
                    ? '/api/v1/workspace-tools/storage/upload?streaming=true' 
                    : '/api/v1/workspace-tools/storage/upload';

                const res = await api.post(endpoint, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                const fileUrl = res.data.url || res.data.fileUrl;
                if (fileUrl) {
                    successCount++;
                    newUploadedItems.push({
                        id: res.data.document?.id || `upload-${Date.now()}-${i}`,
                        url: fileUrl,
                        filename: file.name,
                        source: 'uploaded',
                        isVideo,
                        size: file.size,
                        createdAt: new Date().toISOString(),
                        isBackendDoc: true,
                        docId: res.data.document?.id
                    });
                }
            } catch (err: any) {
                console.error(`Error uploading ${file.name}:`, err);
                toast.error(`Failed to upload ${file.name}`);
            }
        }

        setUploading(false);
        setUploadProgress(null);

        if (successCount > 0) {
            toast.success(`Successfully uploaded ${successCount} file${successCount > 1 ? 's' : ''}`);
            setStorageFiles(prev => [...newUploadedItems, ...prev]);
        }

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const deleteMedia = async (item: MediaItem) => {
        if (!confirm(`Are you sure you want to delete "${item.filename}" from media library?`)) return;
        
        if (item.docId) {
            try {
                await api.delete(`/api/v1/workspace-tools/storage/${item.docId}`);
                setStorageFiles(prev => prev.filter(f => f.id !== item.id && f.docId !== item.docId));
                toast.success('Media deleted from storage');
            } catch (err) {
                console.error(err);
                toast.error('Failed to delete media');
            }
        } else {
            // It's an in-use config reference
            toast('This media is referenced in your website sections. Delete or change the element on your page to remove it.', { icon: 'ℹ️' });
        }
    };

    const copyUrl = (url: string, e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(url);
        setCopiedUrl(url);
        toast.success('Media URL copied to clipboard');
        setTimeout(() => setCopiedUrl(null), 2000);
    };

    return (
        <div 
            className="flex flex-col h-full bg-white relative"
            onDragOver={(e) => {
                if (e.dataTransfer.types.includes('Files')) {
                    e.preventDefault();
                    setIsDragOverDropzone(true);
                }
            }}
            onDragLeave={() => setIsDragOverDropzone(false)}
            onDrop={(e) => {
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    e.preventDefault();
                    setIsDragOverDropzone(false);
                    handleFilesUpload(e.dataTransfer.files);
                }
            }}
        >
            {/* Drag overlay for uploading */}
            {isDragOverDropzone && (
                <div className="absolute inset-0 bg-indigo-600/90 text-white z-50 flex flex-col items-center justify-center gap-2 backdrop-blur-xs p-4 text-center pointer-events-none animate-fadeIn">
                    <Upload className="w-10 h-10 animate-bounce" />
                    <span className="text-sm font-bold">Drop files here to upload</span>
                </div>
            )}

            {/* Header section */}
            <div className="p-4 border-b border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm flex items-center gap-2 text-gray-800">
                        <ImageIcon className="w-4 h-4 text-indigo-600" />
                        Media Library
                        <span className="text-[10px] bg-indigo-50 text-indigo-600 font-semibold px-2 py-0.5 rounded-full">
                            {allMedia.length}
                        </span>
                    </h3>
                    <button
                        onClick={fetchStorageFiles}
                        disabled={loading}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                        title="Refresh library"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Hidden input for file picking */}
                <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    accept="image/*,video/mp4,video/quicktime,video/webm"
                    onChange={(e) => e.target.files && handleFilesUpload(e.target.files)}
                    className="hidden"
                />

                {/* Upload Button + Filter Bar */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>{uploadProgress ? `Uploading (${uploadProgress.current}/${uploadProgress.total})...` : 'Uploading...'}</span>
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4" />
                                <span>Upload Media</span>
                            </>
                        )}
                    </button>

                    <div className="flex bg-gray-100 p-0.5 rounded-xl text-[10px] font-semibold text-gray-600 shrink-0">
                        <button
                            onClick={() => setFilterType('all')}
                            className={`px-2.5 py-1.5 rounded-lg transition-colors ${filterType === 'all' ? 'bg-white text-indigo-600 shadow-xs' : 'hover:text-gray-900'}`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilterType('images')}
                            className={`px-2.5 py-1.5 rounded-lg transition-colors ${filterType === 'images' ? 'bg-white text-indigo-600 shadow-xs' : 'hover:text-gray-900'}`}
                        >
                            Images
                        </button>
                        <button
                            onClick={() => setFilterType('videos')}
                            className={`px-2.5 py-1.5 rounded-lg transition-colors ${filterType === 'videos' ? 'bg-white text-indigo-600 shadow-xs' : 'hover:text-gray-900'}`}
                        >
                            Videos
                        </button>
                    </div>
                </div>
            </div>

            {/* Media Grid Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {loading && allMedia.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-gray-400 space-y-2">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                        <span className="text-xs">Loading media library...</span>
                    </div>
                ) : filteredMedia.length === 0 ? (
                    <div className="text-center p-8 border border-dashed rounded-xl bg-gray-50 space-y-2">
                        <ImageIcon className="w-8 h-8 mx-auto text-gray-300" />
                        <p className="text-xs font-semibold text-gray-600">
                            {searchQuery ? 'No matching media found' : 'No media uploaded yet'}
                        </p>
                        <p className="text-[11px] text-gray-400 max-w-[200px] mx-auto">
                            Upload photos or videos using the dropzone above to reuse across your website.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2.5">
                        {filteredMedia.map((item) => (
                            <div
                                key={item.id}
                                draggable
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('application/vnd.builder.media.url', item.url);
                                    e.dataTransfer.setData('text/plain', item.url);
                                    e.dataTransfer.effectAllowed = 'copyMove';
                                }}
                                onClick={() => onSelectMedia?.(item.url)}
                                className="group relative aspect-square rounded-xl border border-gray-200 overflow-hidden bg-gray-900 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-indigo-400 transition-all flex flex-col justify-end"
                            >
                                {/* Media Preview */}
                                {item.isVideo ? (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-950">
                                        <video src={item.url} className="w-full h-full object-cover opacity-80" muted playsInline />
                                        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-bold text-white flex items-center gap-1 backdrop-blur-xs">
                                            <Film className="w-2.5 h-2.5 text-indigo-400" /> VIDEO
                                        </div>
                                    </div>
                                ) : (
                                    <img
                                        src={item.url}
                                        alt={item.filename}
                                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        loading="lazy"
                                    />
                                )}

                                {/* Source / In-Use Badge */}
                                <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                                    {item.source === 'in_use' && (
                                        <span className="px-1.5 py-0.5 rounded bg-indigo-600/90 text-white text-[9px] font-bold tracking-tight shadow-xs backdrop-blur-xs flex items-center gap-0.5">
                                            <Layers className="w-2.5 h-2.5" /> In Page
                                        </span>
                                    )}
                                </div>

                                {/* Drag Hint Overlay */}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 text-center text-white z-20 space-y-2">
                                    <span className="text-[10px] font-bold leading-tight line-clamp-2 px-1">
                                        {item.filename}
                                    </span>
                                    
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={(e) => copyUrl(item.url, e)}
                                            className="p-1.5 bg-white/20 hover:bg-white/40 text-white rounded-md transition-colors"
                                            title="Copy media URL"
                                        >
                                            {copiedUrl === item.url ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                                        </button>
                                        <a
                                            href={item.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="p-1.5 bg-white/20 hover:bg-white/40 text-white rounded-md transition-colors"
                                            title="Open full image"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                        {item.isBackendDoc && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteMedia(item);
                                                }}
                                                className="p-1.5 bg-white/20 hover:bg-red-500 text-white rounded-md transition-colors"
                                                title="Delete file"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>

                                    <span className="text-[9px] text-gray-300 font-medium tracking-wide">
                                        Drag to canvas
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
