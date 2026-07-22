'use client';

import { LogoLoader } from "@workspace/ui";
import { useState, useMemo } from 'react';
import api from '@/lib/api';
import { X, Building2, Mail, Phone, Globe, AlignLeft, User, BarChart, Settings, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import { PlatformModal } from '@/components/shared/PlatformModal';

interface Props {
    onClose: () => void;
    onSuccess: (client: any) => void;
    editClient?: any;
}

const SIZES = [
    { value: '1-10', label: '1-10 Employees' },
    { value: '11-50', label: '11-50 Employees' },
    { value: '51-200', label: '51-200 Employees' },
    { value: '201-500', label: '201-500 Employees' },
    { value: '501-1000', label: '501-1000 Employees' },
    { value: '1000+', label: '1000+ Employees' }
];

export default function AddClientModal({ onClose, onSuccess, editClient }: Props) {
    const isEdit = !!editClient;
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'basic' | 'company' | 'management'>('basic');
    
    const [form, setForm] = useState({
        name: editClient?.name || '',
        title: editClient?.title || '',
        company: editClient?.companyName || editClient?.company || '',
        email: editClient?.email || '',
        phone: editClient?.phone || '',
        website: editClient?.website || '',
        industry: editClient?.industry || '',
        customIndustry: editClient?.customIndustry || '',
        employeeCount: editClient?.employeeCount || '',
        annualRevenue: editClient?.annualRevenue || 0,
        clv: editClient?.clv || 0,
        country: editClient?.country || '',
        clientType: editClient?.clientType || '',
        leadSource: editClient?.leadSource || '',
        clientTier: editClient?.clientTier || '',
        taxId: editClient?.taxId || '',
        billingAddress: editClient?.billingAddress || '',
        status: editClient?.status || 'active',
        healthStatus: editClient?.healthStatus || 'Healthy',
        assignedManager: editClient?.assignedManager || '',
        notes: editClient?.notes || '',
    });

    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setForm(prev => ({ ...prev, [k]: e.target.value }));

    const showCustomIndustry = form.industry === 'Other';

    // Auto-suggest CLV based on size and industry if new client and no CLV set
    useMemo(() => {
        if (isEdit || form.clv > 0) return;
        if (!form.industry || !form.employeeCount) return;
        
        const sizeMultiplier: Record<string, number> = {
            '1-10': 1, '11-50': 2.5, '51-200': 5, '201-500': 10, '501-1000': 20, '1000+': 50
        };
        const industryBase: Record<string, number> = {
            'Technology': 25000, 'Finance': 35000, 'Healthcare': 30000, 'Manufacturing': 20000, 'Retail': 10000, 'Other': 15000
        };

        const base = industryBase[form.industry] || industryBase['Other'];
        const mult = sizeMultiplier[form.employeeCount] || 1;
        setForm(prev => ({ ...prev, clv: base * mult }));
    }, [form.industry, form.employeeCount, isEdit]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.name.trim()) return toast.error('Contact name is required');
        setLoading(true);
        try {
            if (isEdit) {
                const { data } = await api.put(`/api/clients/${editClient.id}`, form);
                toast.success('Client updated!');
                onSuccess(data.client);
            } else {
                const { data } = await api.post('/api/clients', form);
                toast.success('Client added!');
                onSuccess(data.client);
            }
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to save client');
        } finally {
            setLoading(false);
        }
    }

    return (
        <PlatformModal
            isOpen={true} // AddClientModal only renders when open anyway in its parent
            onClose={onClose}
            title={isEdit ? 'Edit Client' : 'Add Client'}
            icon={Building2}
            iconBgClass="bg-blue-50"
            iconColorClass="text-blue-600"
            maxWidthClass="max-w-2xl"
            onSubmit={handleSubmit}
            subHeader={
                <div className="flex border-b border-gray-100 px-6 mt-2">
                    <button 
                        type="button"
                        onClick={() => setActiveTab('basic')} 
                        className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'basic' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Basic Info
                    </button>
                    <button 
                        type="button"
                        onClick={() => setActiveTab('company')} 
                        className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'company' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Company Details
                    </button>
                    <button 
                        type="button"
                        onClick={() => setActiveTab('management')} 
                        className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'management' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Account Mgmt
                    </button>
                </div>
            }
            footer={
                <>
                    <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                    <button type="submit" disabled={loading} className="btn-primary">
                        {loading ? <LogoLoader className="w-5 h-5 animate-spin" /> : (isEdit ? 'Save Changes' : 'Add Client')}
                    </button>
                </>
            }
        >
            {activeTab === 'basic' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="clientName" className="label">Contact Name *</label>
                                    <input id="clientName" value={form.name} onChange={set('name')} placeholder="Jane Smith" className="input" required />
                                </div>
                                <div>
                                    <label htmlFor="clientTitle" className="label">Title / Role</label>
                                    <input id="clientTitle" value={form.title} onChange={set('title')} placeholder="CTO, Founder..." className="input" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="clientEmail" className="label">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                                        <input id="clientEmail" value={form.email} onChange={set('email')} type="email" placeholder="jane@acme.com" className="input pl-9" />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="clientPhone" className="label">Phone Number</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                                        <input id="clientPhone" value={form.phone} onChange={set('phone')} placeholder="+91 9876543210" className="input pl-9" />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
                                <div>
                                    <label htmlFor="clientType" className="label">Client Type</label>
                                    <select id="clientType" value={form.clientType} onChange={set('clientType')} className="input">
                                        <option value="">Select Type</option>
                                        <option value="Enterprise">Enterprise</option>
                                        <option value="Startup">Startup</option>
                                        <option value="Individual">Individual</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="leadSource" className="label">Lead Source</label>
                                    <select id="leadSource" value={form.leadSource} onChange={set('leadSource')} className="input">
                                        <option value="">Select Source</option>
                                        <option value="Organic">Organic Search</option>
                                        <option value="Referral">Referral</option>
                                        <option value="Paid Social">Paid Social</option>
                                        <option value="Cold Outreach">Cold Outreach</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'company' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="clientCompany" className="label">Company Name</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                                        <input id="clientCompany" value={form.company} onChange={set('company')} placeholder="Acme Corp" className="input pl-9" />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="clientWebsite" className="label">Website</label>
                                    <div className="relative">
                                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                                        <input id="clientWebsite" value={form.website} onChange={set('website')} placeholder="https://acme.com" className="input pl-9" />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="clientIndustry" className="label">Industry</label>
                                    <select id="clientIndustry" value={form.industry} onChange={set('industry')} className="input">
                                        <option value="">Select Industry</option>
                                        <option value="Technology">Technology</option>
                                        <option value="Finance">Finance</option>
                                        <option value="Healthcare">Healthcare</option>
                                        <option value="Manufacturing">Manufacturing</option>
                                        <option value="Retail">Retail</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="employeeCount" className="label">Employee Count</label>
                                    <select id="employeeCount" value={form.employeeCount} onChange={set('employeeCount')} className="input">
                                        <option value="">Select Size</option>
                                        {SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            {showCustomIndustry && (
                                <div>
                                    <label htmlFor="customIndustry" className="label">Specify Industry</label>
                                    <input id="customIndustry" value={form.customIndustry} onChange={set('customIndustry')} placeholder="Space Exploration" className="input" />
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
                                <div>
                                    <label htmlFor="annualRevenue" className="label">Annual Revenue ($)</label>
                                    <input id="annualRevenue" type="number" value={form.annualRevenue} onChange={(e) => setForm(prev => ({ ...prev, annualRevenue: parseFloat(e.target.value) || 0 }))} placeholder="0" className="input" />
                                </div>
                                <div>
                                    <label htmlFor="clv" className="label">Lifetime Value (CLV $)</label>
                                    <div className="relative">
                                        <input id="clv" type="number" value={form.clv} onChange={(e) => setForm(prev => ({ ...prev, clv: parseFloat(e.target.value) || 0 }))} placeholder="0" className="input bg-blue-50/50" />
                                        {!isEdit && form.industry && form.employeeCount && (
                                            <div className="absolute -top-5 right-0 text-[10px] font-bold text-blue-600 flex items-center gap-1">
                                                <Activity className="w-3 h-3" /> Auto
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="country" className="label">Region / Country</label>
                                    <input id="country" value={form.country} onChange={set('country')} placeholder="United States" className="input" />
                                </div>
                                <div>
                                    <label htmlFor="clientTaxId" className="label">Tax ID / VAT No.</label>
                                    <input id="clientTaxId" value={form.taxId} onChange={set('taxId')} placeholder="Optional" className="input" />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="clientAddress" className="label">Billing Address</label>
                                <input id="clientAddress" value={form.billingAddress} onChange={set('billingAddress')} placeholder="Full billing address..." className="input" />
                            </div>
                        </div>
                    )}

                    {activeTab === 'management' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="clientStatus" className="label">Account Status</label>
                                    <select id="clientStatus" value={form.status} onChange={set('status')} className="input">
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="lead">Lead / Prospect</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="healthStatus" className="label">Health Status</label>
                                    <select id="healthStatus" value={form.healthStatus} onChange={set('healthStatus')} className="input">
                                        <option value="Healthy">Healthy</option>
                                        <option value="At Risk">At Risk</option>
                                        <option value="Churned">Churned</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="clientTier" className="label">Client Tier (SLA)</label>
                                    <select id="clientTier" value={form.clientTier} onChange={set('clientTier')} className="input">
                                        <option value="">Standard</option>
                                        <option value="Premium">Premium</option>
                                        <option value="Enterprise">Enterprise</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="assignedManager" className="label">Assigned Manager</label>
                                    <input id="assignedManager" value={form.assignedManager} onChange={set('assignedManager')} placeholder="Manager Name" className="input" />
                                </div>
                            </div>
                            <div className="border-t border-gray-100 pt-4 mt-2">
                                <label htmlFor="clientNotes" className="label">Internal Notes</label>
                                <div className="relative">
                                    <AlignLeft className="absolute left-3 top-3 w-4 h-4 text-gray-400" aria-hidden="true" />
                                    <textarea id="clientNotes" value={form.notes} onChange={set('notes')} placeholder="Any relevant notes..." rows={4} className="input pl-9 resize-none" />
                                </div>
                            </div>
                        </div>
                    )}
        </PlatformModal>
    );
}
