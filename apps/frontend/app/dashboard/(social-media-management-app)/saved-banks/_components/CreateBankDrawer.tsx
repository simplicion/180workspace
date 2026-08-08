import React, { useState } from 'react';
import { Drawer } from '@/components/ui/Drawer';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface CreateBankDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    activeTab: 'hashtag' | 'hook' | 'voice';
    onSuccess: () => void;
}

export function CreateBankDrawer({ isOpen, onClose, activeTab, onSuccess }: CreateBankDrawerProps) {
    const [createForm, setCreateForm] = useState({ name: '', content: '', tags: '' });
    const [saving, setSaving] = useState(false);

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/social-media/saved-banks', {
                type: activeTab,
                name: createForm.name,
                content: createForm.content,
                tags: createForm.tags.split(',').map(t => t.trim()).filter(Boolean)
            });
            toast.success('Created successfully');
            setCreateForm({ name: '', content: '', tags: '' });
            onSuccess();
            onClose();
        } catch (error) {
            toast.error('Failed to create');
        } finally {
            setSaving(false);
        }
    }

    if (!isOpen) return null;

    return (
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            title={`Create New ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`}
            maxWidth="max-w-md"
        >
            <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                        required
                        value={createForm.name}
                        onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))}
                        className="input w-full"
                        placeholder={`E.g. SaaS ${activeTab === 'hashtag' ? 'Hashtags' : 'Hook'}`}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                    <textarea
                        required
                        value={createForm.content}
                        onChange={e => setCreateForm(p => ({ ...p, content: e.target.value }))}
                        className="input w-full min-h-[100px]"
                        placeholder={`Enter your ${activeTab} content...`}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
                    <input
                        value={createForm.tags}
                        onChange={e => setCreateForm(p => ({ ...p, tags: e.target.value }))}
                        className="input w-full"
                        placeholder="B2B, SaaS, Growth"
                    />
                </div>
                <div className="flex gap-3 pt-4 border-t border-gray-100 mt-6">
                    <button type="button" onClick={onClose} className="btn-secondary py-3 flex-1">Cancel</button>
                    <button type="submit" disabled={saving} className="btn-primary py-3 flex-1">
                        {saving ? 'Creating...' : 'Create'}
                    </button>
                </div>
            </form>
        </Drawer>
    );
}
