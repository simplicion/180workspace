import React, { useState } from 'react';
import { Drawer } from '@/components/ui/Drawer';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import CustomSelect from '@/components/ui/CustomSelect';

interface AddAssetDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function AddAssetDrawer({ isOpen, onClose, onSuccess }: AddAssetDrawerProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        url: '',
        title: '',
        type: 'image',
        tags: '',
        description: ''
    });

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/api/social-media/assets', {
                ...formData,
                tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
            });
            toast.success('Asset linked successfully');
            setFormData({ url: '', title: '', type: 'image', tags: '', description: '' });
            onSuccess();
            onClose();
        } catch (error) {
            toast.error('Failed to link asset');
        } finally {
            setLoading(false);
        }
    }

    if (!isOpen) return null;

    return (
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            title="Link External Asset"
            maxWidth="max-w-md"
        >
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Asset URL (Drive, Dropbox, etc.) *</label>
                    <input
                        required
                        type="url"
                        className="input w-full"
                        value={formData.url}
                        onChange={e => setFormData(p => ({ ...p, url: e.target.value }))}
                        placeholder="https://..."
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                        className="input w-full"
                        value={formData.title}
                        onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                        placeholder="e.g. Summer Campaign B-Roll"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <CustomSelect
                        className="input w-full"
                        value={formData.type}
                        onChange={e => setFormData(p => ({ ...p, type: e.target.value }))}
                    >
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                        <option value="folder">Folder</option>
                        <option value="other">Other Link</option>
                    </CustomSelect>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
                    <input
                        className="input w-full"
                        value={formData.tags}
                        onChange={e => setFormData(p => ({ ...p, tags: e.target.value }))}
                        placeholder="Logo, B-Roll, Q3"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                        className="input w-full"
                        rows={3}
                        value={formData.description}
                        onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                        placeholder="Optional description..."
                    />
                </div>
                <div className="flex gap-3 pt-4 border-t border-gray-100 mt-6">
                    <button type="button" onClick={onClose} className="btn-secondary py-3 flex-1">Cancel</button>
                    <button type="submit" disabled={loading} className="btn-primary py-3 flex-1">
                        {loading ? 'Saving...' : 'Link Asset'}
                    </button>
                </div>
            </form>
        </Drawer>
    );
}
