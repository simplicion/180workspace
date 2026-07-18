'use client';

import { LogoLoader } from "@workspace/ui";
import { useCallback, useState, useRef, useEffect } from 'react';
import { Upload, X, FileIcon, ImageIcon, AlertCircle, CheckCircle, Search, Database, ShieldAlert, Tags, Users, ChevronDown, Mail, UserPlus, Link2 } from 'lucide-react';
import api from '@/lib/api';
import clsx from 'clsx';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Props {
    relatedId?: string;
    relatedModel: string;
    onClose: () => void;
    onSuccess: (file: any) => void;
}

interface FileItem {
    file: File;
    preview?: string;
    status: 'pending' | 'uploading' | 'done' | 'error';
    progress: number;
    error?: string;
    result?: any;
}

const MAX_SIZE_MB = 10;
const ACCEPTED = ['image/*', 'audio/*', 'video/*', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.zip'];

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function FileUploadModal({ relatedId, relatedModel, onClose, onSuccess }: Props) {
    const [items, setItems] = useState<FileItem[]>([]);
    const [activeTab, setActiveTab] = useState<'upload' | 'link' | 'vault'>('upload');
    const [linkName, setLinkName] = useState('');
    const [linkUrl, setLinkUrl] = useState('');
    const [linkDescription, setLinkDescription] = useState('');
    const [isSavingLink, setIsSavingLink] = useState(false);
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const [vaultFiles, setVaultFiles] = useState<any[]>([]);
    const [vaultSearch, setVaultSearch] = useState('');
    const [vaultLoading, setVaultLoading] = useState(false);
    const [selectedVaultIds, setSelectedVaultIds] = useState<string[]>([]);
    const [isAttaching, setIsAttaching] = useState(false);

    const [category, setCategory] = useState('General');
    const [tags, setTags] = useState('');
    const [isConfidential, setIsConfidential] = useState(false);
    const [sendEmail, setSendEmail] = useState(false);
    const [taggedUsers, setTaggedUsers] = useState<any[]>([]);
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [userSearch, setUserSearch] = useState('');
    const [loadingUsers, setLoadingUsers] = useState(false);

    const [settingsLoading, setSettingsLoading] = useState(true);
    const [driveConfigured, setDriveConfigured] = useState(false);
    const [cloudinaryConfigured, setCloudinaryConfigured] = useState(false);
    const [storageProvider, setStorageProvider] = useState<'cloudinary' | 'google_drive' | 'r2'>('r2');
    const [googleDriveFolders, setGoogleDriveFolders] = useState<any[]>([]);
    const [selectedDriveFolder, setSelectedDriveFolder] = useState('');
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [isSavingFolder, setIsSavingFolder] = useState(false);

    useEffect(() => {
        setLoadingUsers(true);
        Promise.all([
            api.get('/api/users?limit=200').catch(() => ({ data: { users: [] } })),
            api.get('/api/settings').catch(() => ({ data: null })),
            api.get('/api/integrations/google/folders').catch(() => ({ data: { folders: [] } }))
        ]).then(([usersRes, settingsRes, driveRes]) => {
            setAllUsers(usersRes.data.users || usersRes.data || []);
            setGoogleDriveFolders(driveRes.data.folders || []);
            
            const settings = settingsRes.data?.settings;
            if (settings) {
                const isDriveConf = !!(settings.googleDriveServiceAccount || settings.googleDriveTokens);
                const isCloudinaryConf = !!(settings.cloudinaryCloudName && settings.cloudinaryApiKey && settings.cloudinaryApiSecret);
                
                setDriveConfigured(isDriveConf);
                setCloudinaryConfigured(isCloudinaryConf);
            }
        }).catch(() => { }).finally(() => {
            setSettingsLoading(false);
            setLoadingUsers(false);
        });
    }, []);

    useEffect(() => {
        if (activeTab === 'vault' && vaultFiles.length === 0) {
            fetchVault();
        }
    }, [activeTab]);

    const fetchVault = async () => {
        setVaultLoading(true);
        try {
            const { data } = await api.get('/api/files');
            setVaultFiles(data.files || []);
        } catch (err) {
            toast.error('Failed to load vault files');
        } finally {
            setVaultLoading(false);
        }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        setIsSavingFolder(true);
        try {
            const { data } = await api.post('/api/integrations/google/folders', { name: newFolderName });
            setGoogleDriveFolders(prev => [data.folder, ...prev]);
            setSelectedDriveFolder(data.folder.id);
            setIsCreatingFolder(false);
            setNewFolderName('');
            toast.success('Folder created successfully');
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to create folder');
        }
        setIsSavingFolder(false);
    };

    const addFiles = useCallback(async (files: File[]) => {
        const newItems: FileItem[] = [];
        for (const file of files) {
            if (file.size > MAX_SIZE_MB * 1024 * 1024) continue;
            
            if (file.type.startsWith('video/')) {
                const duration = await new Promise<number>((resolve) => {
                    const video = document.createElement('video');
                    video.preload = 'metadata';
                    video.onloadedmetadata = () => resolve(video.duration);
                    video.onerror = () => resolve(0);
                    video.src = URL.createObjectURL(file);
                });
                
                if (duration > 180) {
                    toast.error(`Video "${file.name}" exceeds the 3 minute limit.`);
                    continue;
                }
            }
            
            newItems.push({
                file,
                preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
                status: 'pending',
                progress: 0,
            });
        }
        setItems((prev) => [...prev, ...newItems]);
    }, []);

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        addFiles(Array.from(e.dataTransfer.files));
    };

    const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) addFiles(Array.from(e.target.files));
    };

    const removeItem = (idx: number) => {
        setItems((prev) => {
            const next = [...prev];
            if (next[idx].preview) URL.revokeObjectURL(next[idx].preview!);
            next.splice(idx, 1);
            return next;
        });
    };

    const uploadAll = async () => {
        const pending = items.filter(i => i.status === 'pending');
        for (const item of pending) {
            const idx = items.indexOf(item);
            setItems(prev => prev.map((it, i) => i === idx ? { ...it, status: 'uploading' } : it));
            try {
                const form = new FormData();
                form.append('file', item.file);
                form.append('relatedId', relatedId || '');
                form.append('relatedModel', relatedModel || 'Vault');
                form.append('folder', category);
                form.append('isConfidential', isConfidential.toString());
                if (tags) {
                    const tagArr = tags.split(',').map(t => t.trim()).filter(Boolean);
                    form.append('tags', JSON.stringify(tagArr));
                }
                form.append('sendEmail', sendEmail.toString());
                if (taggedUsers.length > 0) {
                    form.append('taggedUsers', JSON.stringify(taggedUsers.map(u => u.id)));
                }
                form.append('storageProvider', storageProvider);
                if (storageProvider === 'google_drive' && selectedDriveFolder) {
                    form.append('folderId', selectedDriveFolder);
                }

                const { data } = await api.post('/api/files/upload', form, {
                    onUploadProgress: (e) => {
                        const pct = Math.round((e.loaded / (e.total || 1)) * 100);
                        setItems(prev => prev.map((it, i) => i === idx ? { ...it, progress: pct } : it));
                    },
                });
                setItems(prev => prev.map((it, i) => i === idx ? { ...it, status: 'done', progress: 100, result: data.document } : it));
                onSuccess(data.document);
            } catch (err: any) {
                setItems(prev => prev.map((it, i) => i === idx ? { ...it, status: 'error', error: err?.response?.data?.error || 'Upload failed' } : it));
            }
        }
    };

    const handleAddLink = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!linkUrl) return;
        setIsSavingLink(true);
        try {
            const { data } = await api.post('/api/files/link', {
                name: linkName || linkUrl.split('/').pop() || 'Untitled Link',
                fileUrl: linkUrl,
                folder: category,
                description: linkDescription,
                relatedId: relatedId || null,
                relatedModel: relatedModel || 'Vault',
                isConfidential,
                tags: tags.split(',').map(t => t.trim()).filter(Boolean),
                sendEmail,
                taggedUsers: taggedUsers.map(u => u.id)
            });
            onSuccess(data.document);
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to add link');
        } finally {
            setIsSavingLink(false);
        }
    };

    const handleAttachFromVault = async () => {
        if (selectedVaultIds.length === 0) return;
        setIsAttaching(true);
        let successCount = 0;
        for (const docId of selectedVaultIds) {
            try {
                const { data } = await api.post('/api/files/attach-existing', {
                    documentId: docId,
                    relatedId,
                    relatedModel
                });
                onSuccess(data.document);
                successCount++;
            } catch (err) {
                console.error('Failed to attach:', docId, err);
            }
        }
        if (successCount > 0) {
            toast.success(`Attached ${successCount} document${successCount > 1 ? 's' : ''}`);
            onClose();
        } else {
            toast.error('Failed to attach documents');
        }
        setIsAttaching(false);
    };

    const filteredVault = vaultFiles.filter(f => 
        f.name?.toLowerCase().includes(vaultSearch.toLowerCase()) &&
        f.relatedId !== relatedId // Don't show files already linked to this item
    );

    const toggleUser = (u: any) => {
        setTaggedUsers(prev =>
            prev.find(x => x.id === u.id) ? prev.filter(x => x.id !== u.id) : [...prev, u]
        );
    };

    const filteredUsers = allUsers.filter(u =>
        `${u.name} ${u.email}`.toLowerCase().includes(userSearch.toLowerCase())
    );

    const allDone = items.length > 0 && items.every(i => i.status === 'done' || i.status === 'error');
    const hasPending = items.some(i => i.status === 'pending');
    const isUploading = items.some(i => i.status === 'uploading');

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10 overflow-y-auto max-h-[90vh] scrollbar-thin">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold text-gray-900">Manage Documents</h2>
                    <button onClick={onClose} aria-label="Close modal" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                {settingsLoading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <LogoLoader className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
                        <p className="text-sm text-gray-500">Checking configuration...</p>
                    </div>
                ) : (
                    <>
                        {/* Tabs */}
                        <div className="flex p-1 bg-gray-100 rounded-xl mb-5">
                            <button
                                onClick={() => setActiveTab('upload')}
                                className={clsx(
                                    "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all",
                                    activeTab === 'upload' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                )}
                            >
                                Upload Files
                            </button>
                            <button
                                onClick={() => setActiveTab('link')}
                                className={clsx(
                                    "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all",
                                    activeTab === 'link' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                )}
                            >
                                Add via Link
                            </button>
                            <button
                                onClick={() => setActiveTab('vault')}
                                className={clsx(
                                    "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all",
                                    activeTab === 'vault' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700",
                                    (!relatedId && relatedModel === 'Vault') && "hidden"
                                )}
                            >
                                From Vault
                            </button>
                        </div>

                        {activeTab === 'upload' ? (
                            <>
                                {/* Optional: Subtle warning if not configured instead of a blocking screen */}
                                {!driveConfigured && !settingsLoading && (
                                    <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-100 rounded-xl mb-4">
                                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                                        <p className="text-[10px] text-amber-700 leading-tight">
                                            Cloud storage is not configured. Uploads may fail. Use <b>Add via Link</b> for external documents.
                                        </p>
                                    </div>
                                )}

                                {/* Drop zone */}
                                <div
                                    onDrop={onDrop}
                                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                                    onDragLeave={() => setDragging(false)}
                                    onClick={() => inputRef.current?.click()}
                                    className={clsx(
                                        'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
                                        dragging
                                            ? 'border-indigo-500 bg-indigo-50'
                                            : 'border-gray-200 hover:border-indigo-400 hover:bg-gray-50'
                                    )}
                                >
                                    <Upload className={clsx('w-8 h-8 mx-auto mb-2', dragging ? 'text-indigo-500' : 'text-gray-300')} />
                                    <p className="text-sm font-medium text-gray-700">
                                        {dragging ? 'Drop files here' : 'Drag & drop or click to browse'}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">PDF, Word, Excel, Images, ZIP · Max {MAX_SIZE_MB}MB each</p>
                                    <input
                                        ref={inputRef}
                                        type="file"
                                        multiple
                                        title="Select files to upload"
                                        accept={ACCEPTED.join(',')}
                                        onChange={onInputChange}
                                        className="hidden"
                                    />
                                </div>

                                {/* File list */}
                                {items.length > 0 && (
                                    <div className="mt-4 space-y-2 max-h-52 overflow-y-auto scrollbar-thin pr-1">
                                        {items.map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
                                                <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center">
                                                    {item.preview
                                                        ? <img src={item.preview} alt="" className="w-full h-full object-cover" />
                                                        : <FileIcon className="w-4 h-4 text-gray-400" />
                                                    }
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-gray-800 truncate">{item.file.name}</p>
                                                    <p className="text-[10px] text-gray-400">{formatBytes(item.file.size)}</p>
                                                    {item.status === 'uploading' && (
                                                        <div 
                                                            className="h-1 bg-gray-200 rounded-full mt-1 overflow-hidden" 
                                                            {...{
                                                                role: "progressbar",
                                                                "aria-valuenow": Math.round(item.progress || 0),
                                                                "aria-valuemin": 0,
                                                                "aria-valuemax": 100,
                                                                "aria-label": `Upload progress: ${Math.round(item.progress || 0)}%`
                                                            }}
                                                        >
                                                            <div 
                                                                className="h-full bg-indigo-500 rounded-full transition-all" 
                                                                {...{ style: { width: `${item.progress}%` } as React.CSSProperties }} 
                                                            />
                                                        </div>
                                                    )}
                                                    {item.status === 'error' && (
                                                        <p className="text-[10px] text-red-500 mt-0.5">{item.error}</p>
                                                    )}
                                                </div>

                                                <div className="flex-shrink-0">
                                                    {item.status === 'pending' && (
                                                        <button onClick={() => removeItem(idx)} aria-label="Remove file" className="text-gray-300 hover:text-red-400 transition-colors">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {item.status === 'uploading' && <LogoLoader className="w-4 h-4 animate-spin text-indigo-500" />}
                                                    {item.status === 'done' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                                                    {item.status === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="mt-4 grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">Category</label>
                                        <select value={category} onChange={e => setCategory(e.target.value)} className="input">
                                            <optgroup label="General">
                                                <option value="General">General</option>
                                                <option value="Project">Project File</option>
                                                <option value="Other">Other</option>
                                            </optgroup>
                                            <optgroup label="HR & Employee">
                                                <option value="ID Proof">ID Proof</option>
                                                <option value="Joining Letter">Joining Letter</option>
                                                <option value="Experience Letter">Experience Letter</option>
                                                <option value="Appraisal Letter">Appraisal Letter</option>
                                                <option value="HR">HR / General</option>
                                            </optgroup>
                                            <optgroup label="Finance & Legal">
                                                <option value="Payslip">Payslip</option>
                                                <option value="Finance">Financial / Receipts</option>
                                                <option value="Contract">Contract / Agreement</option>
                                                <option value="Legal">Legal / Compliance</option>
                                            </optgroup>
                                            <optgroup label="Marketing">
                                                <option value="Marketing">Marketing / Assets</option>
                                            </optgroup>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label">Confidentiality</label>
                                        <div className="flex items-center gap-3 h-[42px] px-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer" onClick={() => setIsConfidential(!isConfidential)}>
                                            <input
                                                type="checkbox"
                                                checked={isConfidential}
                                                onChange={e => setIsConfidential(e.target.checked)}
                                                className="w-4 h-4 text-indigo-600 rounded border-gray-300 pointer-events-none"
                                            />
                                            <label className="text-xs font-medium text-gray-700 cursor-pointer flex items-center gap-2">
                                                <ShieldAlert className={clsx("w-3.5 h-3.5", isConfidential ? "text-amber-500" : "text-gray-400")} />
                                                Admin Only
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <label className="label flex items-center gap-2">
                                        <Database className="w-3.5 h-3.5 text-indigo-500" />
                                        Storage Location
                                    </label>
                                    <select 
                                        value={storageProvider} 
                                        onChange={e => setStorageProvider(e.target.value as 'cloudinary' | 'google_drive' | 'r2')} 
                                        className="input w-full"
                                    >
                                        <option value="r2">180workspace Cloud</option>
                                        {cloudinaryConfigured && <option value="cloudinary">Cloudinary</option>}
                                        {driveConfigured && <option value="google_drive">Google Drive</option>}
                                    </select>
                                </div>

                                {storageProvider === 'google_drive' && googleDriveFolders.length > 0 && (
                                    <div className="mt-4">
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="label flex items-center gap-2 mb-0">
                                                <Folder className="w-3.5 h-3.5 text-indigo-500" />
                                                Google Drive Folder (Optional)
                                            </label>
                                            <button 
                                                type="button" 
                                                onClick={() => setIsCreatingFolder(true)} 
                                                className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800"
                                            >
                                                + New Folder
                                            </button>
                                        </div>
                                        {isCreatingFolder ? (
                                            <div className="flex gap-2 items-center">
                                                <input 
                                                    value={newFolderName} 
                                                    onChange={e => setNewFolderName(e.target.value)} 
                                                    placeholder="Folder Name" 
                                                    className="input w-full py-1.5"
                                                    autoFocus
                                                />
                                                <button type="button" onClick={handleCreateFolder} disabled={isSavingFolder} className="btn-primary py-1.5 px-3 text-xs shrink-0">
                                                    {isSavingFolder ? '...' : 'Create'}
                                                </button>
                                                <button type="button" onClick={() => setIsCreatingFolder(false)} disabled={isSavingFolder} className="btn-secondary py-1.5 px-3 text-xs shrink-0">
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                        <select 
                                            value={selectedDriveFolder} 
                                            onChange={e => setSelectedDriveFolder(e.target.value)} 
                                            className="input w-full"
                                        >
                                            <option value="">Default App Folder</option>
                                            {googleDriveFolders.map(f => (
                                                <option key={f.id} value={f.id}>{f.name}</option>
                                            ))}
                                        </select>
                                        )}
                                    </div>
                                )}

                                <div className="flex gap-3 mt-5">
                                    <button onClick={onClose} className="btn-secondary flex-1">
                                        {allDone ? 'Close' : 'Cancel'}
                                    </button>
                                    {!allDone && (
                                        <button
                                            onClick={uploadAll}
                                            disabled={!hasPending || isUploading}
                                            className="btn-primary flex-1"
                                        >
                                            {isUploading ? <LogoLoader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                            {isUploading ? 'Uploading...' : `Upload ${items.filter(i => i.status === 'pending').length} file${items.filter(i => i.status === 'pending').length !== 1 ? 's' : ''}`}
                                        </button>
                                    )}
                                </div>
                            </>
                        ) : activeTab === 'link' ? (
                            <form onSubmit={handleAddLink} className="space-y-4">
                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl mb-2">
                                    <p className="text-xs text-blue-700 leading-relaxed">
                                        Use this option if your file is already on <b>Google Drive</b> or <b>OneDrive</b> and you want to keep it there.
                                    </p>
                                </div>
                                <div>
                                    <label htmlFor="linkName" className="label">Display Name</label>
                                    <input
                                        id="linkName"
                                        value={linkName}
                                        onChange={e => setLinkName(e.target.value)}
                                        placeholder="e.g. Project Proposal"
                                        className="input"
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="linkUrl" className="label">File URL</label>
                                    <input
                                        id="linkUrl"
                                        value={linkUrl}
                                        onChange={e => setLinkUrl(e.target.value)}
                                        placeholder="https://drive.google.com/..."
                                        className="input"
                                        type="url"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="linkCategory" className="label">Category</label>
                                        <select 
                                            id="linkCategory"
                                            value={category} 
                                            onChange={e => setCategory(e.target.value)}
                                            className="input"
                                        >
                                            <optgroup label="General">
                                                <option value="General">General</option>
                                                <option value="Project">Project File</option>
                                                <option value="Other">Other</option>
                                            </optgroup>
                                            <optgroup label="HR & Employee">
                                                <option value="ID Proof">ID Proof</option>
                                                <option value="Joining Letter">Joining Letter</option>
                                                <option value="Experience Letter">Experience Letter</option>
                                                <option value="Appraisal Letter">Appraisal Letter</option>
                                                <option value="HR">HR / General</option>
                                            </optgroup>
                                            <optgroup label="Finance & Legal">
                                                <option value="Payslip">Payslip</option>
                                                <option value="Finance">Financial / Receipts</option>
                                                <option value="Contract">Contract / Agreement</option>
                                                <option value="Legal">Legal / Compliance</option>
                                            </optgroup>
                                            <optgroup label="Marketing">
                                                <option value="Marketing">Marketing / Assets</option>
                                            </optgroup>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="linkConfidential" className="label">Confidential</label>
                                        <div className="flex items-center h-[42px] px-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer" onClick={() => setIsConfidential(!isConfidential)}>
                                            <input 
                                                id="linkConfidential" 
                                                type="checkbox" 
                                                checked={isConfidential}
                                                onChange={e => setIsConfidential(e.target.checked)}
                                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 pointer-events-none" 
                                            />
                                            <span className="ml-2 text-xs text-gray-500">Admin Only</span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="linkDescription" className="label">Description</label>
                                    <textarea
                                        id="linkDescription"
                                        value={linkDescription}
                                        onChange={e => setLinkDescription(e.target.value)}
                                        placeholder="Add some context about this link..."
                                        className="input min-h-[80px] py-2"
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                                    <button
                                        type="submit"
                                        disabled={isSavingLink || !linkUrl}
                                        className="btn-primary flex-1"
                                    >
                                        {isSavingLink ? <LogoLoader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                        {isSavingLink ? 'Saving...' : 'Add Link'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="flex flex-col h-[400px]">
                                <div className="relative mb-4">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search in vault..."
                                        value={vaultSearch}
                                        onChange={e => setVaultSearch(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    />
                                </div>

                                {vaultLoading ? (
                                    <div className="flex-1 flex flex-col items-center justify-center">
                                        <LogoLoader className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
                                        <p className="text-sm text-gray-400">Loading your vault...</p>
                                    </div>
                                ) : filteredVault.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                                            <Database className="w-6 h-6 text-gray-300" />
                                        </div>
                                        <p className="text-sm font-medium text-gray-900">No documents found</p>
                                        <p className="text-xs text-gray-500 mt-1">Try another search or upload a new file.</p>
                                    </div>
                                ) : (
                                    <div className="flex-1 overflow-y-auto scrollbar-thin pr-1 space-y-2">
                                        {filteredVault.map((file) => {
                                            const isSelected = selectedVaultIds.includes(file.id);
                                            return (
                                                <div 
                                                    key={file.id}
                                                    onClick={() => {
                                                        setSelectedVaultIds(prev => 
                                                            isSelected ? prev.filter(id => id !== file.id) : [...prev, file.id]
                                                        );
                                                    }}
                                                    className={clsx(
                                                        "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                                                        isSelected ? "border-indigo-500 bg-indigo-50/50" : "border-gray-50 hover:border-gray-200 bg-gray-50/30"
                                                    )}
                                                >
                                                    <div className={clsx(
                                                        "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                                        isSelected ? "bg-indigo-500 border-indigo-500" : "border-gray-300 bg-white"
                                                    )}>
                                                        {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                                                    </div>
                                                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                                        <FileIcon className="w-4 h-4 text-gray-400" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-medium text-gray-900 truncate">{file.name}</p>
                                                        <p className="text-[10px] text-gray-400 uppercase">{file.category || 'General'}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                <div className="flex gap-3 mt-5 pt-4 border-t border-gray-50">
                                    <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                                    <button
                                        onClick={handleAttachFromVault}
                                        disabled={selectedVaultIds.length === 0 || isAttaching}
                                        className="btn-primary flex-1"
                                    >
                                        {isAttaching ? <LogoLoader className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                                        {isAttaching ? 'Attaching...' : `Attach (${selectedVaultIds.length})`}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Common Metadata Fields (Tags & Users) - Only shown for Upload and Link */}
                        {(activeTab === 'upload' || activeTab === 'link') && (
                            <div className="mt-5 space-y-4 pt-5 border-t border-gray-100 overflow-y-auto max-h-[300px] pr-1 scrollbar-thin">
                                <div>
                                    <label className="label">Tags (comma separated)</label>
                                    <div className="relative">
                                        <Tags className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 font-bold" />
                                        <input
                                            value={tags}
                                            onChange={e => setTags(e.target.value)}
                                            placeholder="e.g. invoice, tax-2024, urgent"
                                            className="input pl-10"
                                        />
                                    </div>
                                </div>

                                <div className="border-t border-gray-50 pt-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <UserPlus className="w-4 h-4 text-indigo-500" />
                                            <span className="text-xs font-semibold text-gray-900">Tag Users</span>
                                            {taggedUsers.length > 0 && (
                                                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">{taggedUsers.length}</span>
                                            )}
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => setShowUserDropdown(!showUserDropdown)}
                                            className="flex items-center gap-1.5 text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 px-2 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors"
                                        >
                                            <Users className="w-3 h-3" /> 
                                            {showUserDropdown ? 'Done' : 'Select Users'} 
                                            <ChevronDown className={clsx('w-3 h-3 transition-transform', showUserDropdown && 'rotate-180')} />
                                        </button>
                                    </div>

                                    {taggedUsers.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mb-3">
                                            {taggedUsers.map(u => (
                                                <span key={u.id} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 text-[10px] px-2 py-1 rounded-full border border-indigo-100 font-medium">
                                                    {u.name}
                                                    <button onClick={() => toggleUser(u)}><X className="w-2.5 h-2.5 text-indigo-400 hover:text-indigo-600" /></button>
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {showUserDropdown && (
                                        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
                                            <div className="p-2 border-b border-gray-100 bg-gray-50">
                                                <input
                                                    value={userSearch} onChange={e => setUserSearch(e.target.value)}
                                                    placeholder="Search users..."
                                                    className="w-full text-[10px] px-3 py-1.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300"
                                                />
                                            </div>
                                            <div className="max-h-32 overflow-y-auto scrollbar-thin">
                                                {loadingUsers ? (
                                                    <div className="flex justify-center py-4"><LogoLoader className="w-4 h-4 animate-spin text-indigo-500" /></div>
                                                ) : filteredUsers.length === 0 ? (
                                                    <p className="text-[10px] text-gray-400 text-center py-4">No users found</p>
                                                ) : filteredUsers.map(u => (
                                                    <button key={u.id} type="button" onClick={() => toggleUser(u)}
                                                        className={clsx('w-full flex items-center gap-3 px-3 py-2 text-left text-[10px] hover:bg-gray-50 transition-colors',
                                                            taggedUsers.find(x => x.id === u.id) ? 'bg-indigo-50' : '')}>
                                                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[8px] flex-shrink-0">
                                                            {u.name?.[0]?.toUpperCase()}
                                                        </div>
                                                        <div className="flex-1 truncate">
                                                            <p className="font-semibold text-gray-900 truncate">{u.name}</p>
                                                            <p className="text-gray-400 truncate">{u.email}</p>
                                                        </div>
                                                        {taggedUsers.find(x => x.id === u.id) && <CheckCircle className="w-3.5 h-3.5 text-indigo-500 ml-auto" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <label className={clsx('flex items-start gap-3 mt-3 p-2.5 rounded-xl border cursor-pointer transition-colors',
                                        sendEmail ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-100 hover:border-gray-200')}>
                                        <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)}
                                            className="w-3.5 h-3.5 text-indigo-600 rounded border-gray-300 mt-0.5" />
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <Mail className="w-3.5 h-3.5 text-indigo-500" />
                                                <span className="text-xs font-semibold text-gray-900">Notify tagged users</span>
                                            </div>
                                            <p className="text-[10px] text-gray-400 leading-tight mt-0.5">
                                                They will receive an email about this document.
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
