'use client';

import { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, Briefcase, ChevronDown, CheckCircle, Info } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { format, addDays, parseISO } from 'date-fns';
import clsx from 'clsx';

interface OpportunityModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editingOpportunity?: any;
}

const STAGES = ['Lead', 'Qualified', 'Demo', 'Proposal', 'Negotiation', 'ClosedWon', 'ClosedLost'];

export default function OpportunityModal({ isOpen, onClose, onSuccess, editingOpportunity }: OpportunityModalProps) {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loadingAccounts, setLoadingAccounts] = useState(false);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        accountId: '',
        value: 0,
        stage: 'Lead',
        probability: 10,
        expectedCloseDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        notes: '',
        priorityScore: 50,
        engagementScore: 50
    });

    useEffect(() => {
        if (isOpen) {
            fetchAccounts();
            if (editingOpportunity) {
                setFormData({
                    title: editingOpportunity.title || '',
                    accountId: editingOpportunity.accountId?.id || editingOpportunity.accountId || '',
                    value: editingOpportunity.value || 0,
                    stage: editingOpportunity.stage || 'Lead',
                    probability: editingOpportunity.probability || 10,
                    expectedCloseDate: editingOpportunity.expectedCloseDate ? format(parseISO(editingOpportunity.expectedCloseDate), 'yyyy-MM-dd') : format(addDays(new Date(), 30), 'yyyy-MM-dd'),
                    notes: editingOpportunity.notes || '',
                    priorityScore: editingOpportunity.priorityScore || 50,
                    engagementScore: editingOpportunity.engagementScore || 50
                });
            } else {
                setFormData({
                    title: '',
                    accountId: '',
                    value: 0,
                    stage: 'Lead',
                    probability: 10,
                    expectedCloseDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
                    notes: '',
                    priorityScore: 50,
                    engagementScore: 50
                });
            }
        }
    }, [isOpen, editingOpportunity]);

    const fetchAccounts = async () => {
        setLoadingAccounts(true);
        try {
            const { data } = await api.get('/api/sales/accounts');
            setAccounts(data.accounts || []);
        } catch (error) {
            console.error('Failed to fetch accounts');
        } finally {
            setLoadingAccounts(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.accountId || !formData.value) {
            return toast.error('Please fill in required fields');
        }

        setSaving(true);
        try {
            if (editingOpportunity) {
                await api.put(`/api/sales/opportunities/${editingOpportunity.id}`, formData);
                toast.success('Opportunity updated');
            } else {
                await api.post('/api/sales/opportunities', formData);
                toast.success('Opportunity created');
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to save opportunity');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                            {editingOpportunity ? 'Edit Opportunity' : 'New Sales Opportunity'}
                        </h2>
                        <p className="text-sm text-gray-500 mt-0.5">Define your deal and track its progress through the pipeline.</p>
                    </div>
                    <button onClick={onClose} aria-label="Close modal" className="p-2 hover:bg-white hover:shadow-md rounded-full text-gray-400 hover:text-gray-600 transition-all border border-transparent hover:border-gray-100">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form className="flex-1 overflow-y-auto px-8 py-8 space-y-8 custom-scrollbar">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                            <Briefcase className="w-3.5 h-3.5" /> Deal Overview
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label htmlFor="dealTitle" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 px-1">Deal Title *</label>
                                <input
                                    id="dealTitle"
                                    type="text" required
                                    placeholder="e.g., Enterprise Software License"
                                    className="input w-full bg-white border-gray-200 focus:ring-2 focus:ring-indigo-500/20 px-4 h-11 transition-all"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="accountId" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 px-1">Company / Account *</label>
                                    <div className="relative">
                                        <select
                                            id="accountId"
                                            required
                                            aria-label="Select Account"
                                            className="input w-full bg-white border-gray-200 appearance-none px-4 h-11 focus:ring-2 focus:ring-indigo-500/20"
                                            value={formData.accountId}
                                            onChange={e => setFormData({ ...formData, accountId: e.target.value })}
                                        >
                                            <option value="">Select an Account</option>
                                            {accounts.map(acc => (
                                                <option key={acc.id} value={acc.id}>{acc.companyName || acc.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    </div>
                                    {loadingAccounts && <p className="text-[10px] text-indigo-500 mt-1 italic animate-pulse">Loading accounts...</p>}
                                </div>
                                <div>
                                    <label htmlFor="dealValue" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 px-1">Deal Value (USD) *</label>
                                    <div className="relative">
                                        <DollarSign className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input
                                            id="dealValue"
                                            type="number" required min="0"
                                            placeholder="0.00"
                                            className="input w-full pl-10 bg-white border-gray-200 focus:ring-2 focus:ring-indigo-500/20 px-4 h-11"
                                            value={formData.value}
                                            onChange={e => setFormData({ ...formData, value: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Timeline & Status */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5" /> Pipeline Status
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 px-1">Pipeline Stage</label>
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {STAGES.map(s => (
                                        <button
                                            key={s} type="button"
                                            onClick={() => setFormData({ ...formData, stage: s })}
                                            className={clsx(
                                                "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                                                formData.stage === s 
                                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100" 
                                                    : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
                                            )}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label htmlFor="closeDate" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 px-1">Expected Close Date</label>
                                <div className="relative">
                                    <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        id="closeDate"
                                        type="date"
                                        className="input w-full pl-10 bg-white border-gray-200 focus:ring-2 focus:ring-indigo-500/20 px-4 h-11"
                                        value={formData.expectedCloseDate}
                                        onChange={e => setFormData({ ...formData, expectedCloseDate: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* AI & Insights */}
                    <div className="bg-gradient-to-br from-indigo-50 to-blue-50/30 p-6 rounded-2xl border border-indigo-100/50 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-widest">Enterprise Scoring (AI Assisted)</h3>
                            <div className="h-0.5 flex-1 bg-indigo-100/50" />
                            <Info className="w-3.5 h-3.5 text-indigo-400" />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label htmlFor="winProb" className="text-[10px] font-bold text-indigo-600 uppercase">Win Probability</label>
                                    <span className="text-xs font-black text-indigo-700">{formData.probability}%</span>
                                </div>
                                <input
                                    id="winProb"
                                    type="range" min="0" max="100" step="5"
                                    className="w-full h-1.5 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    value={formData.probability}
                                    onChange={e => setFormData({ ...formData, probability: Number(e.target.value) })}
                                />
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label htmlFor="priorityScore" className="text-[10px] font-bold text-indigo-600 uppercase">Priority Ranking</label>
                                    <span className="text-xs font-black text-indigo-700">{formData.priorityScore}/100</span>
                                </div>
                                <input
                                    id="priorityScore"
                                    type="range" min="0" max="100"
                                    className="w-full h-1.5 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    value={formData.priorityScore}
                                    onChange={e => setFormData({ ...formData, priorityScore: Number(e.target.value) })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor="notes" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 px-1">Context & Next Steps</label>
                        <textarea
                            id="notes"
                            rows={3}
                            placeholder="Current status, roadblocks, or action items..."
                            className="input w-full py-3 px-4 bg-white border-gray-200 focus:ring-2 focus:ring-indigo-500/20 resize-none"
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>
                </form>

                {/* Footer */}
                <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                    <div className="text-xs text-gray-400 italic">
                        All deals are linked to your current company ID automatically.
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-indigo-600 text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition-all"
                        >
                            {saving ? (
                                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" />
                            ) : (
                                <CheckCircle className="w-4 h-4" />
                            )}
                            {editingOpportunity ? 'Update Opportunity' : 'Save & Launch Deal'}
                        </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
            `}</style>
        </div>
    );
}
