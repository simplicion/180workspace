'use client';

import { LogoLoader } from "@workspace/ui";
import { Drawer } from "@/components/ui/Drawer";
import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { X, Building2, Mail, Phone, Globe, AlignLeft, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import CustomSelect from '@/components/ui/CustomSelect';
import { Country } from 'country-state-city';

const INDUSTRIES = [
    'Technology', 'Healthcare', 'Finance', 'Education', 'Retail', 
    'Manufacturing', 'Real Estate', 'Consulting', 'Other'
];

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: (client: any) => void;
    editClient?: any;
}

export default function AddClientDrawer({ open, onClose, onSuccess, editClient }: Props) {
    const isEdit = !!editClient;
    const [loading, setLoading] = useState(false);
    const countryOptions = React.useMemo(() => {
        return Country.getAllCountries().map(c => ({
            label: `${c.name} (${c.isoCode}) +${c.phonecode}`,
            value: `+${c.phonecode}`,
            displayLabel: `${c.isoCode} +${c.phonecode}`
        }));
    }, []);

    const [form, setForm] = useState({
        name: editClient?.name || '',
        company: editClient?.company || editClient?.companyName || '',
        email: editClient?.email || '',
        phone: editClient?.phone || '',
        website: editClient?.website || '',
        industry: editClient?.industry || '',
        taxId: editClient?.taxId || '',
        billingAddress: editClient?.billingAddress || '',
        status: editClient?.status || 'active',
        notes: editClient?.notes || '',
        givePortalAccess: false,
        password: '',
        shippingAddress: editClient?.shippingAddress || '',
        contactPersonName: editClient?.contactPersonName || '',
        linkedin: editClient?.socialMediaLinks?.linkedin || '',
        paymentTerms: editClient?.paymentTerms || '',
        currency: editClient?.currency || 'USD',
        employeeCount: editClient?.employeeCount || '',
        category: editClient?.category || '',
    });

    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm(prev => ({ ...prev, [k]: e.target.value }));

    const [categoriesList, setCategoriesList] = useState<string[]>([
        'Enterprise', 'SMB', 'VIP Client', 'Retail', 'Wholesale', 'Partner', 'Government', 'Tech & Media', 'Healthcare'
    ]);

    useEffect(() => {
        if (open) {
            api.get('/api/clients/categories')
                .then(({ data }) => {
                    if (data.categories && Array.isArray(data.categories)) {
                        setCategoriesList(data.categories);
                    }
                })
                .catch(() => {});
        }
    }, [open]);

    useEffect(() => {
        if (open) {
            setForm({
                name: editClient?.name || '',
                company: editClient?.company || editClient?.companyName || '',
                email: editClient?.email || '',
                phone: editClient?.phone || '',
                website: editClient?.website || '',
                industry: editClient?.industry || '',
                taxId: editClient?.taxId || '',
                billingAddress: editClient?.billingAddress || '',
                status: editClient?.status || 'active',
                notes: editClient?.notes || '',
                givePortalAccess: false,
                password: '',
                shippingAddress: editClient?.shippingAddress || '',
                contactPersonName: editClient?.contactPersonName || '',
                linkedin: editClient?.socialMediaLinks?.linkedin || '',
                paymentTerms: editClient?.paymentTerms || '',
                currency: editClient?.currency || 'USD',
                employeeCount: editClient?.employeeCount || '',
                category: editClient?.category || '',
            });
        }
    }, [open, editClient]);

    async function handleSubmit(e?: React.FormEvent) {
        if (e && e.preventDefault) e.preventDefault();
        if (!form.name || !form.name.trim()) return toast.error('Client name is required');
        
        if (form.givePortalAccess && !isEdit) {
            if (!form.email || !form.email.trim()) {
                return toast.error('Email Address is required to grant portal access');
            }
            if (!form.password || !form.password.trim()) {
                return toast.error('Password is required to grant portal access');
            }
        }

        setLoading(true);
        try {
            const payload: any = {
                ...form,
                company: form.company || '',
                industry: form.industry || '',
                website: form.website || '',
                taxId: form.taxId || '',
                category: form.category || '',
                status: form.status || 'active',
                billingAddress: form.billingAddress || '',
                socialMediaLinks: { linkedin: form.linkedin || '' }
            };
            
            // Clean up payload to prevent backend Prisma errors
            delete payload.linkedin;
            delete payload.id;
            delete payload._id;
            delete payload.annualRevenue;
            delete payload.location;
            delete payload.country;
            delete payload.customIndustry;
            delete payload.clientType;
            
            const clientId = editClient?.id || editClient?._id;
            if (isEdit && clientId) {
                delete payload.givePortalAccess;
                delete payload.password;
                const { data } = await api.put(`/api/clients/${clientId}`, payload);
                toast.success('Client updated!');
                onSuccess(data.client);
            } else {
                const { data } = await api.post('/api/clients', payload);
                toast.success('Client added!');
                onSuccess(data.client);
            }
            onClose();
        } catch (err: any) {
            console.error('[AddClientDrawer Error]', err);
            toast.error(err?.response?.data?.error || 'Failed to save client');
        } finally {
            setLoading(false);
        }
    }

    const phoneParts = (form.phone || '').trim().split(' ');
    let currentCode = '+1';
    let currentNum = form.phone || '';

    if (phoneParts.length > 0 && phoneParts[0].startsWith('+')) {
        currentCode = phoneParts[0];
        currentNum = phoneParts.slice(1).join(' ');
    }
    
    const handlePhoneCodeChange = (e: any) => {
        const val = e?.target?.value ?? e;
        setForm(prev => ({ ...prev, phone: `${val} ${currentNum}`.trim() }));
    };
    
    const handlePhoneNumChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const cleaned = e.target.value.replace(/[^\d\-\s()]/g, '');
        setForm(prev => ({ ...prev, phone: `${currentCode} ${cleaned}`.trim() }));
    };

    return (
        <Drawer
            open={open}
            onClose={onClose}
            title={isEdit ? 'Edit Client' : 'Add Client'}
            icon={<Building2 className="w-5 h-5" />}
            footer={
                <div className="flex items-center justify-end gap-3">
                    <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                    <button type="button" onClick={handleSubmit} disabled={loading} className="btn-primary">
                        {loading ? <LogoLoader className="w-4 h-4 animate-spin" /> : isEdit ? 'Save Changes' : 'Add Client'}
                    </button>
                </div>
            }
        >
            <div className="grid grid-cols-2 gap-5">
                <div>
                    <label htmlFor="clientName" className="label">Client Name *</label>
                    <input id="clientName" value={form.name} onChange={set('name')} placeholder="Jane Smith" className="input" required />
                </div>
                <div>
                    <label htmlFor="clientCompany" className="label">Company / Org Name</label>
                    <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                        <input id="clientCompany" value={form.company} onChange={set('company')} placeholder="Acme Corp (Optional)" className="input pl-9" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-5 mt-5">
                <div>
                    <label htmlFor="clientEmail" className="label">
                        Email Address {form.givePortalAccess && <span className="text-red-500">*</span>}
                    </label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                        <input id="clientEmail" value={form.email} onChange={set('email')} type="email" placeholder="jane@acme.com" className="input pl-9" required={form.givePortalAccess} />
                    </div>
                </div>
                <div>
                    <label htmlFor="clientPhone" className="label">Phone Number</label>
                    <div className="flex gap-2">
                        <div className="w-32 shrink-0">
                            <CustomSelect 
                                value={currentCode}
                                onChange={handlePhoneCodeChange}
                                options={countryOptions}
                            />
                        </div>
                        <input 
                            id="clientPhone" 
                            type="tel" 
                            placeholder="(555) 000-0000" 
                            className="input flex-1" 
                            value={currentNum} 
                            onChange={handlePhoneNumChange} 
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-5 border-t border-gray-100 dark:border-gray-800 pt-5 mt-5">
                <div>
                    <label htmlFor="clientIndustry" className="label">Industry</label>
                    <CustomSelect
                        label=""
                        value={form.industry}
                        onChange={(val: any) => setForm(prev => ({ ...prev, industry: val?.target?.value ?? val }))}
                        options={INDUSTRIES}
                        placeholder="Select or type..."
                        searchable={true}
                        creatable={true}
                    />
                </div>
                <div>
                    <label htmlFor="clientCategory" className="label">Category</label>
                    <CustomSelect
                        label=""
                        value={form.category}
                        onChange={(val: any) => setForm(prev => ({ ...prev, category: val?.target?.value ?? val }))}
                        options={categoriesList}
                        placeholder="Select or type category..."
                        searchable={true}
                        creatable={true}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-5 mt-5">
                <div>
                    <label htmlFor="clientWebsite" className="label">Website</label>
                    <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                        <input id="clientWebsite" value={form.website} onChange={set('website')} placeholder="https://acme.com" className="input pl-9" />
                    </div>
                </div>
                <div>
                    <label htmlFor="clientLinkedin" className="label">LinkedIn URL</label>
                    <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                        <input id="clientLinkedin" value={form.linkedin} onChange={set('linkedin')} placeholder="https://linkedin.com/company/acme" className="input pl-9" />
                    </div>
                </div>
            </div>

            <div className="mt-5">
                <label htmlFor="clientTaxId" className="label">Tax ID / VAT No.</label>
                <input id="clientTaxId" value={form.taxId} onChange={set('taxId')} placeholder="Optional" className="input" />
            </div>

            <div className="mt-5">
                <label htmlFor="clientAddress" className="label">Client Address</label>
                <input id="clientAddress" value={form.billingAddress} onChange={set('billingAddress')} placeholder="Full address..." className="input" />
            </div>

            <div className="mt-5">
                <label htmlFor="clientEmployeeCount" className="label">Employee Count</label>
                <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                    <input id="clientEmployeeCount" value={form.employeeCount} onChange={set('employeeCount')} placeholder="e.g. 50-200" className="input pl-9" />
                </div>
            </div>

            {!isEdit && (
                <div className="border border-gray-100 dark:border-gray-800 rounded-lg p-5 mt-5 bg-gray-50/50 dark:bg-gray-800/30">
                    <label className="flex items-center gap-2 cursor-pointer mb-4">
                        <input 
                            type="checkbox" 
                            className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                            checked={form.givePortalAccess}
                            onChange={(e) => setForm(prev => ({ ...prev, givePortalAccess: e.target.checked }))}
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Give Portal Access</span>
                    </label>
                    {form.givePortalAccess && (
                        <div>
                            <label htmlFor="clientPassword" className="label">Client Password *</label>
                            <input 
                                id="clientPassword" 
                                type="text" 
                                value={form.password} 
                                onChange={set('password')} 
                                placeholder="Set a temporary password" 
                                className="input" 
                                required={form.givePortalAccess} 
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">An email will be sent to the client with these credentials.</p>
                        </div>
                    )}
                </div>
            )}

            <div className="border-t border-gray-100 dark:border-gray-800 pt-5 mt-5">
                <label htmlFor="clientNotes" className="label">Internal Notes</label>
                <div className="relative">
                    <AlignLeft className="absolute left-3 top-3 w-4 h-4 text-gray-400" aria-hidden="true" />
                    <textarea id="clientNotes" value={form.notes} onChange={set('notes')} placeholder="Any relevant notes..." rows={3} className="input pl-9 resize-none" />
                </div>
            </div>
        </Drawer>
    );
}
