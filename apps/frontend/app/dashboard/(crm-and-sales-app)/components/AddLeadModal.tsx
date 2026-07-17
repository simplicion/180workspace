'use client';

import { LogoLoader } from "@workspace/ui";
import { X, Target, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    lead?: any; // If provided, we are in edit mode
}

export default function AddLeadModal({ isOpen, onClose, onSuccess, lead }: Props) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        company: '',
        email: '',
        phone: '',
        source: 'outbound',
        industry: '',
        status: 'new',
        value: 0
    });

    useEffect(() => {
        if (lead) {
            setFormData({
                name: lead.name || '',
                company: lead.company || '',
                email: lead.email || '',
                phone: lead.phone || '',
                source: lead.source || 'outbound',
                industry: lead.industry || '',
                status: lead.status || 'new',
                value: lead.value || 0
            });
        } else {
            setFormData({
                name: '',
                company: '',
                email: '',
                phone: '',
                source: 'outbound',
                industry: '',
                status: 'new',
                value: 0
            });
        }
    }, [lead, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (lead) {
                await api.put(`/api/sales/leads/${lead.id || lead.id}`, formData);
                toast.success('Lead updated successfully');
            } else {
                await api.post('/api/sales/leads', formData);
                toast.success('Lead created successfully');
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            const message = err.response?.data?.error || 'Failed to save lead';
            toast.error(message);
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
                            <Target className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">{lead ? 'Edit Lead' : 'Add New Lead'}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="Close modal">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5 md:col-span-2">
                            <label htmlFor="leadName" className="text-sm font-semibold text-gray-700 font-mono uppercase tracking-tighter">Full Name *</label>
                            <input
                                id="leadName"
                                required
                                type="text"
                                className="input w-full"
                                placeholder="e.g. John Doe"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                            <label htmlFor="leadCompany" className="text-sm font-semibold text-gray-700 font-mono uppercase tracking-tighter">Company Name *</label>
                            <input
                                id="leadCompany"
                                required
                                type="text"
                                className="input w-full"
                                placeholder="e.g. Acme Corp"
                                value={formData.company}
                                onChange={e => setFormData({ ...formData, company: e.target.value })}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="leadEmail" className="text-sm font-semibold text-gray-700 font-mono uppercase tracking-tighter">Email Address</label>
                            <input
                                id="leadEmail"
                                type="email"
                                className="input w-full"
                                placeholder="john@example.com"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="leadPhone" className="text-sm font-semibold text-gray-700 font-mono uppercase tracking-tighter">Phone Number</label>
                            <input
                                id="leadPhone"
                                type="text"
                                className="input w-full"
                                placeholder="+1 (555) 000-0000"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="leadSource" className="text-sm font-semibold text-gray-700 font-mono uppercase tracking-tighter">Source</label>
                            <select
                                id="leadSource"
                                className="input w-full"
                                value={formData.source}
                                onChange={e => setFormData({ ...formData, source: e.target.value })}
                            >
                                <option value="outbound">Outbound</option>
                                <option value="inbound">Inbound</option>
                                <option value="referral">Referral</option>
                                <option value="website">Website</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="leadIndustry" className="text-sm font-semibold text-gray-700 font-mono uppercase tracking-tighter">Industry</label>
                            <input
                                id="leadIndustry"
                                type="text"
                                className="input w-full"
                                placeholder="e.g. Technology"
                                value={formData.industry}
                                onChange={e => setFormData({ ...formData, industry: e.target.value })}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="leadStatus" className="text-sm font-semibold text-gray-700 font-mono uppercase tracking-tighter">Status</label>
                            <select
                                id="leadStatus"
                                className="input w-full"
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="new">New Lead</option>
                                <option value="contacted">Contacted</option>
                                <option value="qualified">Qualified</option>
                                <option value="converted">Converted</option>
                                <option value="lost">Lost</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="leadValue" className="text-sm font-semibold text-gray-700 font-mono uppercase tracking-tighter">Estimated Value ($)</label>
                            <input
                                id="leadValue"
                                type="number"
                                className="input w-full"
                                placeholder="0.00"
                                value={formData.value}
                                onChange={e => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                            />
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
                            {loading ? <LogoLoader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {lead ? 'Update Lead' : 'Create Lead'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

