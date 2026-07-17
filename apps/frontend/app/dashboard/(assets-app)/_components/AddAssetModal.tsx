'use client';

import { LogoLoader } from "@workspace/ui";
import { useState, useEffect } from 'react';
import { X, Globe, Server, Code, Key, Github, Cloud } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface AddAssetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    asset?: any; // For editing
}

const ASSET_TYPES = [
    { value: 'domain', label: 'Domain Registration', icon: Globe },
    { value: 'server', label: 'Server / VPS', icon: Server },
    { value: 'api', label: 'API / Integration', icon: Code },
    { value: 'license', label: 'Software License', icon: Key },
    { value: 'repo', label: 'Git Repository', icon: Github },
    { value: 'service', label: 'Third-party Service', icon: Cloud },
];

export default function AddAssetModal({ isOpen, onClose, onSuccess, asset }: AddAssetModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        type: 'domain',
        provider: '',
        status: 'active',
        renewalDate: '',
        cost: '',
        billingCycle: 'monthly',
        url: '',
        description: '',
    });

    useEffect(() => {
        if (asset) {
            setFormData({
                name: asset.name || '',
                type: asset.type || 'domain',
                provider: asset.provider || '',
                status: asset.status || 'active',
                renewalDate: asset.renewalDate ? asset.renewalDate.split('T')[0] : '',
                cost: asset.cost?.toString() || '',
                billingCycle: asset.billingCycle || 'monthly',
                url: asset.url || '',
                description: asset.description || '',
            });
        } else {
            setFormData({
                name: '',
                type: 'domain',
                provider: '',
                status: 'active',
                renewalDate: '',
                cost: '',
                billingCycle: 'monthly',
                url: '',
                description: '',
            });
        }
    }, [asset, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.name.trim()) {
            toast.error('Asset name is required');
            return;
        }

        setLoading(true);

        // Functional Fix: Data Normalization
        const payload = {
            ...formData,
            cost: formData.cost === '' ? 0 : Number(formData.cost),
            renewalDate: formData.renewalDate === '' ? null : formData.renewalDate,
            url: formData.url.trim() === '' ? null : formData.url.trim(),
        };

        try {
            if (asset) {
                await api.put(`/api/assets/${asset.id}`, payload);
                toast.success('Asset updated successfully');
            } else {
                await api.post('/api/assets', payload);
                toast.success('Asset added successfully');
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to save asset');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl w-full max-w-xl shadow-xl overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">{asset ? 'Edit Asset' : 'Add Asset'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600" title="Close">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Asset Type Selection */}
                    <div className="space-y-3">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Asset Type</label>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            {ASSET_TYPES.map((t) => (
                                <button
                                    key={t.value}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: t.value })}
                                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                                        formData.type === t.value
                                            ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                                            : 'border-gray-50 bg-gray-50 text-gray-500 hover:border-gray-200'
                                    }`}
                                >
                                    <t.icon className={`w-5 h-5 ${formData.type === t.value ? 'text-indigo-600' : 'text-gray-400'}`} />
                                    <span className="text-[10px] font-bold uppercase truncate w-full text-center">{t.label.split(' ')[0]}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label htmlFor="asset-name" className="text-xs font-semibold text-gray-500">Asset Name *</label>
                            <input
                                id="asset-name"
                                required
                                type="text"
                                className="input"
                                placeholder="e.g. ims-platform.com"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="provider" className="text-xs font-semibold text-gray-500">Provider</label>
                            <input
                                id="provider"
                                type="text"
                                className="input"
                                placeholder="e.g. AWS, GoDaddy"
                                value={formData.provider}
                                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label htmlFor="url" className="text-xs font-semibold text-gray-500">URL / Endpoint</label>
                            <input
                                id="url"
                                type="text"
                                className="input"
                                placeholder="https://..."
                                value={formData.url}
                                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="renewalDate" className="text-xs font-semibold text-gray-500">Renewal Date</label>
                            <input
                                id="renewalDate"
                                type="date"
                                className="input"
                                value={formData.renewalDate}
                                onChange={(e) => setFormData({ ...formData, renewalDate: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label htmlFor="cost" className="text-xs font-semibold text-gray-500">Cost (₹)</label>
                            <input
                                id="cost"
                                type="number"
                                className="input"
                                placeholder="0"
                                value={formData.cost}
                                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="billingCycle" className="text-xs font-semibold text-gray-500">Billing Cycle</label>
                            <select
                                id="billingCycle"
                                className="input"
                                value={formData.billingCycle}
                                onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value })}
                            >
                                <option value="monthly">Monthly</option>
                                <option value="yearly">Yearly</option>
                                <option value="one-time">One-time</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label htmlFor="description" className="text-xs font-semibold text-gray-500">Description</label>
                        <textarea
                            id="description"
                            className="input min-h-[100px] resize-none"
                            placeholder="Additional details..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>
                </form>

                <div className="p-6 border-t border-gray-100 flex gap-3 bg-gray-50/50">
                    <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="btn-primary flex-1 shadow-md shadow-indigo-100"
                    >
                        {loading ? <LogoLoader className="w-4 h-4 animate-spin mx-auto" /> : (asset ? 'Update Asset' : 'Add Asset')}
                    </button>
                </div>
            </div>
        </div>
    );
}
