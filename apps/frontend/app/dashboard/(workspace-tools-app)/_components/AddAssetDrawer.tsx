'use client';

import { LogoLoader } from "@workspace/ui";
import { Drawer } from "@/components/ui/Drawer";
import { useState, useEffect } from 'react';
import { X, Globe, Server, Code, Key, Github, Cloud } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import CustomSelect from '@/components/ui/CustomSelect';

interface AddAssetDrawerProps {
    open: boolean;
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

export default function AddAssetDrawer({ open, onClose, onSuccess, asset }: AddAssetDrawerProps) {
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
    }, [asset, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.name.trim()) {
            toast.error('Asset name is required');
            return;
        }

        setLoading(true);

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
        <form onSubmit={handleSubmit}>
            <Drawer
                open={open}
                onClose={onClose}
                title={asset ? 'Edit Asset' : 'Add Asset'}
                icon={<Globe className="w-5 h-5" />}
                footer={
                    <>
                        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                        <button type="submit" disabled={loading} className="btn-primary flex-1 shadow-md shadow-indigo-100">
                            {loading ? <LogoLoader className="w-4 h-4 animate-spin mx-auto" /> : (asset ? 'Update Asset' : 'Add Asset')}
                        </button>
                    </>
                }
            >
            <div className="space-y-3">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Asset Type</label>
                <div className="grid grid-cols-3 gap-2">
                    {ASSET_TYPES.map((t) => (
                        <button
                            key={t.value}
                            type="button"
                            onClick={() => setFormData({ ...formData, type: t.value })}
                            className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all h-20 ${
                                formData.type === t.value
                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                                    : 'border-gray-50 bg-gray-50 text-gray-500 hover:border-gray-200'
                            }`}
                        >
                            <t.icon className={`w-5 h-5 ${formData.type === t.value ? 'text-indigo-600' : 'text-gray-400'}`} />
                            <span className="text-[10px] font-bold uppercase truncate w-full text-center leading-tight whitespace-normal">{t.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-4 pt-3">
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

            <div className="space-y-4 pt-3">
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

            <div className="grid grid-cols-2 gap-4 pt-3">
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
                    <CustomSelect
                        id="billingCycle"
                        className="input"
                        value={formData.billingCycle}
                        onChange={(val: string) => setFormData({ ...formData, billingCycle: val })}
                    >
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                        <option value="one-time">One-time</option>
                    </CustomSelect>
                </div>
            </div>

            <div className="space-y-1.5 pt-3 pb-6">
                <label htmlFor="description" className="text-xs font-semibold text-gray-500">Description</label>
                <textarea
                    id="description"
                    className="input min-h-[100px] resize-none"
                    placeholder="Additional details..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
            </div>
            </Drawer>
        </form>
    );
}
