'use client';

import { X, Building2, Loader2, Save, Activity } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    account?: any; // If provided, we are in edit mode
}

const INDUSTRIES = [
    { label: 'Technology', value: 'Technology', baseClv: 15000 },
    { label: 'Healthcare', value: 'Healthcare', baseClv: 25000 },
    { label: 'Finance', value: 'Finance', baseClv: 35000 },
    { label: 'Manufacturing', value: 'Manufacturing', baseClv: 20000 },
    { label: 'Retail', value: 'Retail', baseClv: 8000 },
    { label: 'Education', value: 'Education', baseClv: 12000 },
    { label: 'Real Estate', value: 'Real Estate', baseClv: 30000 },
    { label: 'Other', value: 'Other', baseClv: 10000 }
];

const SIZES = [
    { label: '1-10 (Startup)', value: '1-10', multiplier: 0.5 },
    { label: '11-50 (Small)', value: '11-50', multiplier: 1.0 },
    { label: '51-200 (Medium)', value: '51-200', multiplier: 2.5 },
    { label: '201-500 (Enterprise)', value: '201-500', multiplier: 5.0 },
    { label: '500+ (Global)', value: '500+', multiplier: 12.0 }
];

export default function AddAccountModal({ isOpen, onClose, onSuccess, account }: Props) {
    const [loading, setLoading] = useState(false);
    const [showCustomIndustry, setShowCustomIndustry] = useState(false);
    const [formData, setFormData] = useState({
        companyName: '',
        industry: '',
        customIndustry: '',
        website: '',
        employeeCount: '',
        clv: 0
    });

    // Auto-calculate CLV based on parameters
    useEffect(() => {
        if (account) return; // Don't auto-calculate when editing existing account

        const selectedIndustry = INDUSTRIES.find(i => i.value === formData.industry);
        const selectedSize = SIZES.find(s => s.value === formData.employeeCount);

        if (selectedIndustry && selectedSize) {
            const calculatedValue = selectedIndustry.baseClv * selectedSize.multiplier;
            setFormData(prev => ({ ...prev, clv: calculatedValue }));
        }
    }, [formData.industry, formData.employeeCount, account]);

    useEffect(() => {
        if (account) {
            setFormData({
                companyName: account.companyName || '',
                industry: INDUSTRIES.some(i => i.value === account.industry) ? account.industry : (account.industry ? 'Other' : ''),
                customIndustry: !INDUSTRIES.some(i => i.value === account.industry) ? account.industry : '',
                website: account.website || '',
                employeeCount: account.employeeCount || '',
                clv: account.clv || 0
            });
            setShowCustomIndustry(!INDUSTRIES.some(i => i.value === account.industry) && !!account.industry);
        } else if (isOpen) {
            setFormData({
                companyName: '',
                industry: '',
                customIndustry: '',
                website: '',
                employeeCount: '',
                clv: 0
            });
            setShowCustomIndustry(false);
        }
    }, [account, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const finalData = {
                ...formData,
                industry: formData.industry === 'Other' ? formData.customIndustry : formData.industry
            };
            
            if (account) {
                await api.put(`/api/sales/accounts/${account.id || account.id}`, finalData);
                toast.success('Account updated');
            } else {
                await api.post('/api/sales/accounts', finalData);
                toast.success('Account created');
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to save account');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">{account ? 'Edit Account' : 'Add New Account'}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="Close modal">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5 md:col-span-2">
                            <label htmlFor="companyName" className="text-sm font-bold text-indigo-900/60 font-mono uppercase tracking-tighter">Company Name *</label>
                            <input
                                id="companyName"
                                required
                                type="text"
                                className="input w-full"
                                placeholder="e.g. Acme Corp"
                                value={formData.companyName}
                                onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="industry" className="text-sm font-bold text-indigo-900/60 font-mono uppercase tracking-tighter">Industry</label>
                            <select
                                id="industry"
                                required
                                className="input w-full"
                                value={formData.industry}
                                onChange={e => {
                                    const val = e.target.value;
                                    setFormData({ ...formData, industry: val });
                                    setShowCustomIndustry(val === 'Other');
                                }}
                            >
                                <option value="">Select Sector</option>
                                {INDUSTRIES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="employeeCount" className="text-sm font-bold text-indigo-900/60 font-mono uppercase tracking-tighter">Employee Count</label>
                            <select
                                id="employeeCount"
                                className="input w-full"
                                value={formData.employeeCount}
                                onChange={e => setFormData({ ...formData, employeeCount: e.target.value })}
                            >
                                <option value="">Select Size</option>
                                {SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                        </div>

                        {showCustomIndustry && (
                            <div className="space-y-1.5 md:col-span-2 animate-in slide-in-from-top-2 duration-200">
                                <label htmlFor="customIndustry" className="text-sm font-bold text-indigo-900/60 font-mono uppercase tracking-tighter">Specify Other Industry</label>
                                <input
                                    id="customIndustry"
                                    type="text"
                                    className="input w-full border-dashed border-indigo-200"
                                    placeholder="e.g. Space Exploration"
                                    value={formData.customIndustry}
                                    onChange={e => setFormData({ ...formData, customIndustry: e.target.value })}
                                />
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label htmlFor="website" className="text-sm font-bold text-indigo-900/60 font-mono uppercase tracking-tighter">Website</label>
                            <input
                                id="website"
                                type="url"
                                className="input w-full"
                                placeholder="https://example.com"
                                value={formData.website}
                                onChange={e => setFormData({ ...formData, website: e.target.value })}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="clv" className="text-sm font-bold text-indigo-900/60 font-mono uppercase tracking-tighter">Lifetime Value ($)</label>
                            <div className="relative">
                                <input
                                    id="clv"
                                    type="number"
                                    className="input w-full pl-8 bg-indigo-50/30 font-bold text-indigo-700"
                                    placeholder="0.00"
                                    value={formData.clv}
                                    onChange={e => setFormData({ ...formData, clv: parseFloat(e.target.value) || 0 })}
                                />
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 font-bold">$</span>
                                {!account && formData.industry && formData.employeeCount && (
                                    <div className="absolute -top-6 right-0 text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                                        <Activity className="w-3 h-3" />
                                        Auto-Suggested
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-gray-50 flex items-center justify-end gap-3 rounded-b-2xl border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {account ? 'Update Account' : 'Create Account'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
