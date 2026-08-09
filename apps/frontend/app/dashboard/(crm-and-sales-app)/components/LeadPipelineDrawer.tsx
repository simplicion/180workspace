'use client';

import { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, Briefcase, ChevronDown, CheckCircle, Info } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { format, addDays, parseISO } from 'date-fns';
import clsx from 'clsx';
import { Drawer } from "@/components/ui/Drawer";

interface LeadPipelineDrawerProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editingLeadPipeline?: any;
    pipelineType?: 'DEAL' | 'ACTIVE_CLIENT';
}

const STAGES = ['Lead', 'Contacted', 'Qualified', 'Demo', 'Proposal', 'Negotiation', 'ClosedWon', 'ClosedLost'];

export default function LeadPipelineDrawer({ open, onClose, onSuccess, editingLeadPipeline, pipelineType }: LeadPipelineDrawerProps) {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
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
        engagementScore: 50,
        type: 'Lead',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        companyName: '',
        industry: '',
        source: '',
        owner: '',
        followUpDate: '',
        followUpTime: ''
    });

    useEffect(() => {
        if (open) {
            fetchAccounts();
            fetchUsers();
            if (editingLeadPipeline) {
                setFormData({
                    title: editingLeadPipeline.title || '',
                    accountId: editingLeadPipeline.accountId?.id || editingLeadPipeline.accountId || '',
                    value: editingLeadPipeline.value || 0,
                    stage: editingLeadPipeline.stage || 'Lead',
                    probability: editingLeadPipeline.probability || 10,
                    expectedCloseDate: editingLeadPipeline.expectedCloseDate ? format(parseISO(editingLeadPipeline.expectedCloseDate), 'yyyy-MM-dd') : format(addDays(new Date(), 30), 'yyyy-MM-dd'),
                    notes: editingLeadPipeline.notes || '',
                    priorityScore: editingLeadPipeline.priorityScore || 50,
                    engagementScore: editingLeadPipeline.engagementScore || 50,
                    type: editingLeadPipeline.tags?.includes('Lead') ? 'Lead' : 'lead pipeline',
                    contactName: editingLeadPipeline.contactName || '',
                    contactEmail: editingLeadPipeline.contactEmail || '',
                    contactPhone: editingLeadPipeline.contactPhone || '',
                    companyName: editingLeadPipeline.companyName || '',
                    industry: editingLeadPipeline.industry || '',
                    source: editingLeadPipeline.source || '',
                    owner: editingLeadPipeline.ownerId || '',
                    followUpDate: '',
                    followUpTime: ''
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
                    engagementScore: 50,
                    type: 'Lead',
                    contactName: '',
                    contactEmail: '',
                    contactPhone: '',
                    companyName: '',
                    industry: '',
                    source: '',
                    owner: '',
                    followUpDate: '',
                    followUpTime: ''
                });
            }
        }
    }, [open, editingLeadPipeline]);

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

    const fetchUsers = async () => {
        try {
            const { data } = await api.get('/api/users', { params: { limit: 100 } });
            setUsers(data.users || []);
        } catch (error) {
            console.error('Failed to fetch users');
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.value) {
            return toast.error('Please fill in required fields');
        }
        if (formData.type === 'lead pipeline' && !formData.accountId) {
            return toast.error('Account is required for Opportunities');
        }

        const tags = formData.type === 'Lead' ? ['Lead'] : ['lead pipeline'];
        const submissionData = { ...formData, tags, pipelineType: pipelineType || 'DEAL' };
        if (!submissionData.accountId) delete (submissionData as any).accountId;
        delete (submissionData as any).type;
        
        setSaving(true);
        try {
            if (editingLeadPipeline) {
                await api.put(`/api/sales/leads-pipeline/${editingLeadPipeline.id}`, submissionData);
                toast.success('Lead Pipeline updated');
            } else {
                await api.post('/api/sales/leads-pipeline', submissionData);
                toast.success('Lead Pipeline created');
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to save lead pipeline');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Drawer
            open={open}
            onClose={onClose}
            size="max-w-2xl"
            title={editingLeadPipeline ? 'Edit Lead Pipeline' : 'New Lead Pipeline'}
            icon={<Briefcase className="w-5 h-5" />}
            footer={
                <>
                    <div className="text-xs text-gray-400 italic">
                        Deals are linked to your company ID.
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} type="button" className="btn-secondary">Cancel</button>
                        <button onClick={handleSave} type="button" disabled={saving} className="btn-primary">
                            {saving ? (
                                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" />
                            ) : (
                                editingLeadPipeline ? 'Update Lead Pipeline' : 'Save & Launch Deal'
                            )}
                        </button>
                    </div>
                </>
            }
        >
            <div>
                <label htmlFor="dealTitle" className="label">Deal Title *</label>
                <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                    <input
                        id="dealTitle"
                        type="text" required
                        placeholder="e.g., Enterprise Software License"
                        className="input pl-9"
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label htmlFor="contactName" className="label">Contact Name *</label>
                    <input id="contactName" required type="text" placeholder="John Doe" className="input" value={formData.contactName} onChange={e => setFormData({ ...formData, contactName: e.target.value })} />
                </div>
                <div>
                    <label htmlFor="companyName" className="label">Company Name *</label>
                    <input id="companyName" required type="text" placeholder="Acme Corp" className="input" value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })} />
                </div>
                <div>
                    <label htmlFor="contactEmail" className="label">Email Address</label>
                    <input id="contactEmail" type="email" placeholder="john@example.com" className="input" value={formData.contactEmail} onChange={e => setFormData({ ...formData, contactEmail: e.target.value })} />
                </div>
                <div>
                    <label htmlFor="contactPhone" className="label">Phone Number</label>
                    <input id="contactPhone" type="tel" placeholder="+1 (555) 000-0000" className="input" value={formData.contactPhone} onChange={e => setFormData({ ...formData, contactPhone: e.target.value })} />
                </div>
                <div>
                    <label htmlFor="source" className="label">Source</label>
                    <select id="source" className="select" value={formData.source} onChange={e => setFormData({ ...formData, source: e.target.value })}>
                        <option value="">Select Source</option>
                        <option value="Inbound">Inbound</option>
                        <option value="Outbound">Outbound</option>
                        <option value="Referral">Referral</option>
                        <option value="Event">Event</option>
                        <option value="Custom">Custom</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="industry" className="label">Industry</label>
                    <input id="industry" type="text" placeholder="e.g. Technology" className="input" value={formData.industry} onChange={e => setFormData({ ...formData, industry: e.target.value })} />
                </div>
                <div>
                    <label htmlFor="dealValue" className="label">Deal Value (USD) *</label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                        <input
                            id="dealValue"
                            type="number" required min="0"
                            placeholder="0.00"
                            className="input pl-9"
                            value={formData.value}
                            onChange={e => setFormData({ ...formData, value: Number(e.target.value) })}
                        />
                    </div>
                </div>
                <div>
                    <label htmlFor="stage" className="label">Stage</label>
                    <select id="stage" className="select" value={formData.stage} onChange={e => setFormData({ ...formData, stage: e.target.value })}>
                        {STAGES.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="owner" className="label">Assign To</label>
                    <select id="owner" className="select" value={formData.owner} onChange={e => setFormData({ ...formData, owner: e.target.value })}>
                        <option value="">Unassigned</option>
                        {users.map(u => (
                            <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="followUpDate" className="label">Follow-up Date</label>
                    <input id="followUpDate" type="date" className="input" value={formData.followUpDate} onChange={e => setFormData({ ...formData, followUpDate: e.target.value })} />
                </div>
                <div>
                    <label htmlFor="followUpTime" className="label">Follow-up Time</label>
                    <input id="followUpTime" type="time" className="input" value={formData.followUpTime} onChange={e => setFormData({ ...formData, followUpTime: e.target.value })} />
                </div>
            </div>

            <div>
                <label htmlFor="notes" className="label">Context & Next Steps</label>
                <textarea
                    id="notes"
                    placeholder="Current status, roadblocks, or action items..."
                    className="textarea"
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                />
            </div>
        </Drawer>
    );
}
