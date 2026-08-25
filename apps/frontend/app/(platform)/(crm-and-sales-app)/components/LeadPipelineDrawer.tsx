'use client';

import { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, Briefcase, ChevronDown, CheckCircle, Info } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { format, addDays, parseISO } from 'date-fns';
import clsx from 'clsx';
import { Drawer } from "@/components/ui/Drawer";
import CustomSelect from '@/components/ui/CustomSelect';
import { ConfirmModal } from "@workspace/ui";
import { useSettings } from '@/lib/settings-context';
import { industriesList } from '@workspace/common';

interface LeadPipelineDrawerProps {
    open: boolean;
    onClose: () => void;
    onSuccess: (deletedId?: string) => void;
    editingLeadPipeline?: any;
    pipelineType?: 'DEAL' | 'ACTIVE_CLIENT';
}

const STAGES = ['Lead', 'Contacted', 'Qualified', 'Demo', 'Proposal', 'Negotiation', 'ClosedWon', 'ClosedLost'];

export default function LeadPipelineDrawer({ open, onClose, onSuccess, editingLeadPipeline, pipelineType }: LeadPipelineDrawerProps) {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loadingAccounts, setLoadingAccounts] = useState(false);
    const [saving, setSaving] = useState(false);
    const [currencies, setCurrencies] = useState<any>({ rates: {}, base: 'USD' });
    const { company } = useSettings();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

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
        contactPhone: '',
        companyName: '',
        industry: '',
        source: '',
        currency: company?.currency || 'USD',
        owner: '',
        followUpDate: '',
    });

    useEffect(() => {
        if (open) {
            fetchAccounts();
            fetchUsers();
            fetchCurrencies();
            
            const now = new Date();
            // Format to YYYY-MM-DDThh:mm for datetime-local
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            const currentDatetime = now.toISOString().slice(0, 16);

            if (editingLeadPipeline) {
                setFormData({
                    title: editingLeadPipeline.title || '',
                    accountId: editingLeadPipeline.clientId || editingLeadPipeline.accountId?.id || editingLeadPipeline.accountId || '',
                    value: editingLeadPipeline.value || '',
                    stage: editingLeadPipeline.stage || 'Lead',
                    probability: editingLeadPipeline.probability || 10,
                    expectedCloseDate: editingLeadPipeline.expectedCloseDate ? format(parseISO(editingLeadPipeline.expectedCloseDate), 'yyyy-MM-dd') : format(addDays(new Date(), 30), 'yyyy-MM-dd'),
                    notes: editingLeadPipeline.notes || '',
                    priorityScore: editingLeadPipeline.priorityScore || 50,
                    engagementScore: editingLeadPipeline.engagementScore || 50,
                    type: editingLeadPipeline.tags?.includes('Lead') ? 'Lead' : 'lead pipeline',
                    contactName: editingLeadPipeline.client?.name || editingLeadPipeline.contactName || '',
                    contactEmail: editingLeadPipeline.client?.email || editingLeadPipeline.contactEmail || '',
                    contactPhone: editingLeadPipeline.client?.phone || editingLeadPipeline.contactPhone || '',
                    companyName: editingLeadPipeline.client?.companyName || editingLeadPipeline.companyName || '',
                    industry: editingLeadPipeline.client?.industry || editingLeadPipeline.industry || '',
                    source: editingLeadPipeline.source || '',
                    currency: editingLeadPipeline.currency || company?.currency || 'USD',
                    owner: editingLeadPipeline.ownerId || '',
                    followUpDate: editingLeadPipeline.followUpDate ? format(parseISO(editingLeadPipeline.followUpDate), "yyyy-MM-dd'T'HH:mm") : currentDatetime,
                });
            } else {
                setFormData({
                    title: '',
                    accountId: '',
                    value: '',
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
                    currency: company?.currency || 'USD',
                    owner: '',
                    followUpDate: currentDatetime,
                });
            }
        }
    }, [open, editingLeadPipeline, company?.currency]);

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
            const { data } = await api.get('/api/v1/identity/users', { params: { limit: 100 } });
            setUsers(data.users || []);
        } catch (error) {
            console.error('Failed to fetch users');
        }
    };

    const fetchCurrencies = async () => {
        try {
            const res = await fetch('/api/data/currencies');
            const data = await res.json();
            setCurrencies(data);
        } catch (error) {
            console.error('Failed to fetch currencies');
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
        const submissionData: any = { ...formData, tags, pipelineType: pipelineType || 'DEAL' };
        if (submissionData.accountId) {
            submissionData.clientId = submissionData.accountId;
        }
        delete submissionData.accountId;
        delete submissionData.type;
        
        setSaving(true);
        try {
            if (editingLeadPipeline) {
                await api.put(`/api/sales/opportunities/${editingLeadPipeline.id}`, submissionData);
                toast.success('Lead Pipeline updated');
            } else {
                await api.post('/api/sales/opportunities', submissionData);
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

    const handleDelete = async () => {
        if (!editingLeadPipeline?.id) return;
        setDeleting(true);
        try {
            await api.delete(`/api/sales/opportunities/${editingLeadPipeline.id}`);
            toast.success('Lead deleted successfully');
            onSuccess(editingLeadPipeline.id);
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to delete lead');
        } finally {
            setDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    const calculateConvertedAmount = () => {
        if (!formData.value || !formData.currency || !currencies.rates) return null;
        if (formData.currency === company?.currency) return null;

        const baseCurrencyRate = currencies.rates[formData.currency];
        const targetCurrencyRate = currencies.rates[company?.currency || 'USD'];
        
        if (!baseCurrencyRate || !targetCurrencyRate) return null;

        const numValue = Number(formData.value?.toString().replace(/[^0-9.-]+/g,""));
        if (isNaN(numValue) || numValue === 0) return null;

        // Convert to base currency (usually USD) then to target currency
        const converted = (numValue / baseCurrencyRate) * targetCurrencyRate;
        return converted;
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
                        {editingLeadPipeline && (
                            <button onClick={() => setShowDeleteConfirm(true)} type="button" disabled={saving} className="btn-danger mr-auto">
                                Delete Lead
                            </button>
                        )}
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
                <div>
                    <label htmlFor="leadType" className="label">Type *</label>
                    <CustomSelect id="leadType" className="select" required value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                        <option value="">Select Type</option>
                        <option value="Lead">Lead</option>
                        <option value="lead pipeline">Opportunity</option>
                        <option value="Prospect">Prospect</option>
                    </CustomSelect>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label htmlFor="contactName" className="label">Client Name *</label>
                    <input id="contactName" required type="text" placeholder="John Doe" className="input" value={formData.contactName} onChange={e => setFormData({ ...formData, contactName: e.target.value })} />
                </div>
                <div>
                    <label htmlFor="companyName" className="label">Company Name</label>
                    <input id="companyName" type="text" placeholder="Acme Corp" className="input" value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })} />
                </div>
                <div>
                    <label htmlFor="contactEmail" className="label">Email Address</label>
                    <input id="contactEmail" type="email" pattern="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$" title="Please enter a valid email address" placeholder="john@example.com" className="input" value={formData.contactEmail} onChange={e => setFormData({ ...formData, contactEmail: e.target.value })} />
                </div>
                <div>
                    <label htmlFor="contactPhone" className="label">Phone Number</label>
                    <input id="contactPhone" type="tel" pattern="^\+?[1-9]\d{1,14}$" title="Please enter a valid phone number (e.g. +1234567890)" placeholder="+1 (555) 000-0000" className="input" value={formData.contactPhone} onChange={e => setFormData({ ...formData, contactPhone: e.target.value })} />
                </div>
                <div>
                    <label htmlFor="source" className="label">Source *</label>
                    <CustomSelect id="source" className="select" required value={formData.source} onChange={e => setFormData({ ...formData, source: e.target.value })}>
                        <option value="">Select Source</option>
                        <option value="Inbound">Inbound</option>
                        <option value="Outbound">Outbound</option>
                        <option value="Referral">Referral</option>
                        <option value="Event">Event</option>
                        <option value="Custom">Custom</option>
                    </CustomSelect>
                </div>
                <div>
                    <label htmlFor="industry" className="label">Industry *</label>
                    <CustomSelect id="industry" className="select" required value={formData.industry} onChange={e => setFormData({ ...formData, industry: e.target.value })}>
                        <option value="">Select Industry</option>
                        {industriesList.map(industry => (
                            <option key={industry} value={industry}>{industry}</option>
                        ))}
                    </CustomSelect>
                </div>
                <div>
                    <label htmlFor="dealValue" className="label">Estimated Lead Amount</label>
                    <div className="flex gap-2">
                        <div className="w-28 shrink-0">
                            <CustomSelect 
                                value={formData.currency}
                                onChange={(e: any) => setFormData({ ...formData, currency: e.target.value })}
                            >
                                {Object.keys(currencies.rates || { USD: 1, INR: 83, EUR: 0.9, GBP: 0.7 }).map(cur => (
                                    <option key={cur} value={cur}>{cur}</option>
                                ))}
                            </CustomSelect>
                        </div>
                        <div className="relative flex-1">
                            <input
                                id="dealValue"
                                type="text"
                                placeholder="0.00"
                                className="input"
                                value={formData.value || ''}
                                onChange={e => setFormData({ ...formData, value: e.target.value })}
                            />
                        </div>
                    </div>
                    {calculateConvertedAmount() !== null && (
                        <div className="text-xs text-gray-500 mt-1 font-medium">
                            (&approx; {company?.currencySymbol}{(calculateConvertedAmount() ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} {company?.currency})
                        </div>
                    )}
                </div>
                <div>
                    <label htmlFor="followUpDate" className="label">Follow-up Date & Time</label>
                    <input id="followUpDate" type="datetime-local" className="input" value={formData.followUpDate} onChange={e => setFormData({ ...formData, followUpDate: e.target.value })} />
                </div>
                <div>
                    <label htmlFor="owner" className="label">Assign To</label>
                    <CustomSelect id="owner" className="select" value={formData.owner} onChange={e => setFormData({ ...formData, owner: e.target.value })}>
                        <option value="">Unassigned</option>
                        {users.map(u => (
                            <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                        ))}
                    </CustomSelect>
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

            <ConfirmModal
                isOpen={showDeleteConfirm}
                title="Delete Lead"
                message={`Are you sure you want to delete "${editingLeadPipeline?.title}"? This will not delete the associated client info.`}
                confirmText="Delete"
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteConfirm(false)}
                loading={deleting}
                variant="danger"
            />
        </Drawer>
    );
}
