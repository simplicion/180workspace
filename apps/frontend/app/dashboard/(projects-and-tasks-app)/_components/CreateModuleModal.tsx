'use client';

import { LogoLoader } from "@workspace/ui";
import React, { useState, useEffect } from 'react';
import { X, Layout, User, AlignLeft, Type } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface Props {
    projectId: string;
    onClose: () => void;
    onSuccess: (module: any) => void;
}

export default function CreateModuleModal({ projectId, onClose, onSuccess }: Props) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [ownerId, setOwnerId] = useState('');
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchingUsers, setFetchingUsers] = useState(true);

    useEffect(() => {
        api.get('/api/users', { params: { limit: 100 } })
            .then(({ data }) => setUsers(data.users || []))
            .catch((err) => console.error('Failed to load users', err))
            .finally(() => setFetchingUsers(false));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return toast.error('Module name is required');
        if (!ownerId) return toast.error('Please select a module owner');

        setLoading(true);
        try {
            const { data } = await api.post('/api/modules', {
                name,
                description,
                ownerId,
                projectId,
            });
            toast.success('Module created!');
            const createdModule = data.module || data;
            const fullOwner = users.find(u => u.id === ownerId);
            if (fullOwner) {
                createdModule.ownerId = fullOwner;
            }
            onSuccess(createdModule);
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to create module');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

                {/* Header — matches CreateTaskModal */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                            <Layout className="w-4 h-4 text-blue-600" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">Create Module</h2>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close modal"
                        title="Close modal"
                        className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
                    >
                        <X className="w-4 h-4 text-gray-500" aria-hidden="true" />
                    </button>
                </div>

                {/* Body — scrollable like CreateTaskModal */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

                    {/* Module Name */}
                    <div>
                        <label htmlFor="moduleName" className="label">Module Name *</label>
                        <div className="relative">
                            <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                            <input
                                id="moduleName"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Frontend Architecture"
                                className="input pl-9"
                                required
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor="moduleDescription" className="label">Description</label>
                        <div className="relative">
                            <AlignLeft className="absolute left-3 top-3 w-4 h-4 text-gray-400" aria-hidden="true" />
                            <textarea
                                id="moduleDescription"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Briefly describe what this module covers..."
                                rows={3}
                                className="input pl-9 resize-none"
                            />
                        </div>
                    </div>

                    {/* Module Owner */}
                    <div>
                        <label htmlFor="moduleOwner" className="label">Module Owner *</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                            <select
                                id="moduleOwner"
                                value={ownerId}
                                onChange={(e) => setOwnerId(e.target.value)}
                                className="select pl-9"
                                disabled={fetchingUsers}
                                title="Select module owner"
                                required
                            >
                                <option value="">
                                    {fetchingUsers ? 'Loading users...' : 'Select an owner'}
                                </option>
                                {users.map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {u.name} ({u.role})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <p className="mt-1 text-xs text-gray-400">
                            Owner will have manage permissions for tasks in this module
                        </p>
                    </div>

                </form>

                {/* Footer — matches CreateTaskModal */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                    <button onClick={onClose} type="button" className="btn-secondary">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={loading || fetchingUsers} className="btn-primary">
                        {loading ? <LogoLoader className="w-4 h-4 animate-spin" /> : 'Create Module'}
                    </button>
                </div>

            </div>
        </div>
    );
}
