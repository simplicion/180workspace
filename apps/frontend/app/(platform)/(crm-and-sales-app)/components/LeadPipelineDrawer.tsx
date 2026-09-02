'use client';

import React, { useState, useEffect } from 'react';
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
import { Country } from 'country-state-city';

interface LeadPipelineDrawerProps {
    open: boolean;
    onClose: () => void;
    onSuccess: (deletedId?: string) => void;
    editingLeadPipeline?: any;
    pipelineType?: 'DEAL' | 'LEAD' | 'ACTIVE_CLIENT';
}

const STAGES = ['Lead', 'Contacted', 'Qualified', 'Demo', 'Proposal', 'Negotiation', 'ClosedWon', 'ClosedLost'];

export default function LeadPipelineDrawer({ open, onClose, onSuccess, editingLeadPipeline, pipelineType }: LeadPipelineDrawerProps) {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loadingAccounts, setLoadingAccounts] = useState(false);
    const [saving, setSaving] = useState(false);
    const [currencies, setCurrencies] = useState<any>({ rates: {}, base: 'USD' });
    const { company } = useSettings();
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const countryOptions = React.useMemo(() => {
        return Country.getAllCountries().map(c => ({
            label: `${c.flag} ${c.name} (+${c.phonecode})`,
            value: `+${c.phonecode}`,
            displayLabel: `${c.flag} +${c.phonecode}`
        }));
    }, []);

    const isDealContext = pipelineType === 'DEAL' || editingLeadPipeline?.pipelineType === 'DEAL';

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
        currency: company?.currency || 'USD',
        owner: '',
        followUpDate: '',
    });

    const handleClientSelect = (value: string) => {
        const existingClient = accounts.find(a => (a.name || a.companyName) === value);
        if (existingClient) {
            setFormData(prev => ({
                ...prev,
                title: (!prev.title || prev.title === prev.contactName) && !isDealContext ? value : prev.title,
                contactName: value,
                contactEmail: existingClient.email || prev.contactEmail,
                contactPhone: existingClient.phone || prev.contactPhone,
                companyName: existingClient.companyName || prev.companyName,
                industry: existingClient.industry || prev.industry,
                accountId: existingClient.id
            }));
        } else {
            setFormData(prev => ({ 
                ...prev, 
                title: (!prev.title || prev.title === prev.contactName) && !isDealContext ? value : prev.title,
                contactName: value, 
                accountId: '' 
            }));
        }
    };

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
                    title: editingLeadPipeline.title || editingLeadPipeline.name || '',
                    accountId: editingLeadPipeline.clientId || editingLeadPipeline.accountId?.id || editingLeadPipeline.accountId || '',
                    value: editingLeadPipeline.value || '',
                    stage: editingLeadPipeline.stage || editingLeadPipeline.status || 'Lead',
                    probability: editingLeadPipeline.probability || 10,
                    expectedCloseDate: editingLeadPipeline.expectedCloseDate ? format(parseISO(editingLeadPipeline.expectedCloseDate), 'yyyy-MM-dd') : format(addDays(new Date(), 30), 'yyyy-MM-dd'),
                    notes: editingLeadPipeline.notes || '',
                    priorityScore: editingLeadPipeline.priorityScore || 50,
                    engagementScore: editingLeadPipeline.engagementScore || 50,
                    type: editingLeadPipeline.tags?.includes('Lead') || !isDealContext ? 'Lead' : 'lead pipeline',
                    contactName: editingLeadPipeline.client?.name || editingLeadPipeline.contactName || editingLeadPipeline.name || '',
                    contactEmail: editingLeadPipeline.client?.email || editingLeadPipeline.contactEmail || editingLeadPipeline.email || '',
                    contactPhone: editingLeadPipeline.client?.phone || editingLeadPipeline.contactPhone || editingLeadPipeline.phone || '',
                    companyName: editingLeadPipeline.client?.companyName || editingLeadPipeline.companyName || editingLeadPipeline.company || '',
                    industry: editingLeadPipeline.client?.industry || editingLeadPipeline.industry || '',
                    source: editingLeadPipeline.source || 'Outbound',
                    currency: editingLeadPipeline.currency || company?.currency || 'USD',
                    owner: editingLeadPipeline.ownerId || editingLeadPipeline.assignedSalesRepId || '',
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
                    source: 'Outbound',
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
            const { data } = await api.get('/api/users', { params: { limit: 100 } });
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
        
        // Mandatory fields validation
        if (isDealContext) {
            if (!formData.title || !formData.contactName || !formData.source || !formData.owner || !formData.followUpDate) {
                return toast.error('Please fill in all required fields');
            }
        } else {
            if (!formData.contactName) {
                return toast.error('Client Name is required');
            }
            if (!formData.source) {
                return toast.error('Source is required');
            }
            if (!formData.owner) {
                return toast.error('Assign To is required');
            }
            if (!formData.followUpDate) {
                return toast.error('Follow-up Date & Time is required');
            }
        }

        // Contact info validation (either email or phone)
        if (!formData.contactEmail && !formData.contactPhone) {
            return toast.error('Either Phone Number or Email Address is required');
        }

        if (formData.type === 'lead pipeline' && !formData.accountId) {
            return toast.error('Account is required for Opportunities');
        }

        const tags = formData.type === 'Lead' ? ['Lead'] : ['lead pipeline'];
        const resolvedTitle = formData.title || formData.contactName || 'New Lead';
        const submissionData: any = { ...formData, title: resolvedTitle, tags, pipelineType: pipelineType || 'DEAL' };
        if (submissionData.accountId) {
            submissionData.clientId = submissionData.accountId;
        }
        delete submissionData.accountId;
        delete submissionData.type;
        submissionData.value = submissionData.value ? Number(submissionData.value.toString().replace(/[^0-9.-]+/g,"")) || 0 : 0;
        
        const isDeal = submissionData.pipelineType === 'DEAL';
        if (!isDeal) {
            // Map title/contactName to 'name' for Prisma Lead model
            submissionData.name = resolvedTitle;
        }
        
        setSaving(true);
        try {
            const endpointBase = isDeal ? '/api/sales/deals' : '/api/sales/leads';
            if (editingLeadPipeline) {
                await api.put(`${endpointBase}/${editingLeadPipeline.id}`, submissionData);
                toast.success(isDeal ? 'Deal updated' : 'Lead updated');
            } else {
                await api.post(endpointBase, submissionData);
                toast.success(isDeal ? 'Deal created' : 'Lead created');
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.error || `Failed to save ${isDeal ? 'deal' : 'lead'}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!editingLeadPipeline?.id) return;
        setDeleting(true);
        const isDeal = editingLeadPipeline.pipelineType === 'DEAL' || !editingLeadPipeline.name;
        try {
            const endpoint = isDeal ? `/api/sales/deals/${editingLeadPipeline.id}` : `/api/sales/leads/${editingLeadPipeline.id}`;
            await api.delete(endpoint);
            toast.success(`${isDeal ? 'Deal' : 'Lead'} deleted successfully`);
            onSuccess(editingLeadPipeline.id);
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.error || `Failed to delete ${isDeal ? 'deal' : 'lead'}`);
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

    const phoneParts = (formData.contactPhone || '').trim().split(' ');
    let currentCode = '+1';
    let currentNum = formData.contactPhone || '';

    if (phoneParts.length > 0 && phoneParts[0].startsWith('+')) {
        currentCode = phoneParts[0];
        currentNum = phoneParts.slice(1).join(' ');
    }
    
    const handlePhoneCodeChange = (e: any) => {
        setFormData({ ...formData, contactPhone: `${e.target.value} ${currentNum}`.trim() });
    };
    
    const handlePhoneNumChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const cleaned = e.target.value.replace(/[^\d\-\s()]/g, '');
        setFormData({ ...formData, contactPhone: `${currentCode} ${cleaned}`.trim() });
    };

    const phoneExistsInAccounts = accounts.some(a => 
        a.phone && formData.contactPhone && 
        a.phone.replace(/\D/g, '') === formData.contactPhone.replace(/\D/g, '') && 
        a.phone.replace(/\D/g, '') !== '' &&
        (a.name || a.companyName) !== formData.contactName
    );

    return (
        <Drawer
            open={open}
            onClose={onClose}
            size="max-w-2xl"
            title={editingLeadPipeline ? (isDealContext ? 'Edit Deal' : 'Edit Lead') : (isDealContext ? 'New Deal' : 'New Lead')}
            icon={<Briefcase className="w-5 h-5" />}
            footer={
                <>
                    <div className="flex gap-3">
                        {editingLeadPipeline && (
                            <button onClick={() => setShowDeleteConfirm(true)} type="button" disabled={saving} className="btn-danger mr-auto">
                                {isDealContext ? 'Delete Deal' : 'Delete Lead'}
                            </button>
                        )}
                        <button onClick={onClose} type="button" className="btn-secondary">Cancel</button>
                        <button onClick={handleSave} type="button" disabled={saving} className="btn-primary">
                            {saving ? (
                                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" />
                            ) : (
                                editingLeadPipeline ? (isDealContext ? 'Update Deal' : 'Update Lead') : (isDealContext ? 'Save & Launch Deal' : 'Save Lead')
                            )}
                        </button>
                    </div>
                </>
            }
        >
            <div>
                <label htmlFor="dealTitle" className="label">{isDealContext ? 'Deal Title *' : 'Lead Name (Auto-filled from Client Name)'}</label>
                <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                    <input
                        id="dealTitle"
                        type="text"
                        placeholder={isDealContext ? "e.g., Enterprise Software License" : (formData.contactName || "e.g., John Doe")}
                        className="input pl-9"
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                    />
                </div>

            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label htmlFor="contactName" className="label">Client Name *</label>
                    <CustomSelect 
                        id="contactName" 
                        required 
                        creatable={true}
                        placeholder="John Doe"
                        className="select"
                        value={formData.contactName} 
                        onChange={(e: any) => handleClientSelect(e.target.value)} 
                        options={accounts.map(a => ({ label: a.name || a.companyName, value: a.name || a.companyName }))}
                    />
                </div>
                <div>
                    <label htmlFor="companyName" className="label">Company Name</label>
                    <input id="companyName" type="text" placeholder="Acme Corp" className="input" value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })} />
                </div>
                <div>
                    <label htmlFor="contactPhone" className="label">Phone Number {formData.contactEmail ? '' : '*'}</label>
                    <div className="flex gap-2">
                        <div className="w-32 shrink-0">
                            <CustomSelect 
                                value={currentCode}
                                onChange={handlePhoneCodeChange}
                                options={countryOptions}
                            />
                        </div>
                        <input 
                            id="contactPhone" 
                            type="tel" 
                            placeholder="(555) 000-0000" 
                            className="input flex-1" 
                            value={currentNum} 
                            onChange={handlePhoneNumChange} 
                        />
                    </div>
                    {phoneExistsInAccounts && (
                        <div className="text-amber-600 text-[11px] mt-1 flex items-start gap-1 font-medium leading-tight">
                            <Info className="w-3.5 h-3.5 shrink-0" />
                            A client with this phone number already exists. Consider selecting them from the Client Name field above.
                        </div>
                    )}
                </div>
                <div>
                    <label htmlFor="contactEmail" className="label">Email Address {formData.contactPhone ? '' : '*'}</label>
                    <input id="contactEmail" type="email" pattern="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$" title="Please enter a valid email address" placeholder="john@example.com" className="input" value={formData.contactEmail} onChange={e => setFormData({ ...formData, contactEmail: e.target.value })} />
                </div>
                <div>
                    <label htmlFor="source" className="label">Source *</label>
                    <CustomSelect 
                        id="source" 
                        className="select" 
                        required 
                        value={formData.source} 
                        onChange={(e: any) => setFormData({ ...formData, source: e.target.value })}
                        options={['Outbound', 'Inbound', 'Referral', 'Event']}
                        creatable={true}
                    />
                </div>
                <div>
                    <label htmlFor="industry" className="label">Industry</label>
                    <CustomSelect 
                        id="industry" 
                        className="select" 
                        placeholder="Select Industry (Optional)"
                        value={formData.industry} 
                        onChange={(e: any) => setFormData({ ...formData, industry: e.target.value })}
                        options={industriesList || []}
                        creatable={true}
                    />
                </div>
                <div>
                    <label htmlFor="dealValue" className="label">Estimated Lead Amount</label>
                    <div className="flex gap-2">
                        <div className="w-28 shrink-0">
                            <CustomSelect 
                                value={formData.currency}
                                onChange={(e: any) => setFormData({ ...formData, currency: e.target.value })}
                            >
                                {(Object.keys(currencies?.rates || { USD: 1, INR: 83, EUR: 0.9, GBP: 0.7 }) || []).map(cur => (
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
                    <label htmlFor="followUpDate" className="label">Follow-up Date & Time *</label>
                    <input id="followUpDate" required type="datetime-local" className="input" value={formData.followUpDate} onChange={e => setFormData({ ...formData, followUpDate: e.target.value })} />
                </div>
                <div>
                    <label htmlFor="owner" className="label">Assign To *</label>
                    <CustomSelect 
                        id="owner" 
                        required
                        className="select" 
                        value={formData.owner} 
                        onChange={(e: any) => setFormData({ ...formData, owner: e.target.value })}
                        options={[{ label: 'Unassigned', value: '' }, ...(users || []).map((u: any) => ({ label: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown User', value: u.id }))]}
                    />
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
