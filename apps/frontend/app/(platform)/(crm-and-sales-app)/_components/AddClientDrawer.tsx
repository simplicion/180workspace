'use client';

import { LogoLoader } from "@workspace/ui";
import { Drawer } from "@/components/ui/Drawer";
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { X, Building2, Mail, Phone, Globe, AlignLeft, MapPin, Users, DollarSign, Tag } from 'lucide-react';
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
    const [isCompany, setIsCompany] = useState(!!editClient?.company);
    const countryOptions = React.useMemo(() => {
        return Country.getAllCountries().map(c => ({
            label: `${c.name} (${c.isoCode}) +${c.phonecode}`,
            value: `+${c.phonecode}`,
            displayLabel: `${c.isoCode} +${c.phonecode}`
        }));
    }, []);

    const [form, setForm] = useState({
        name: editClient?.name || '',
        company: editClient?.company || '',
        email: editClient?.email || '',
        phone: editClient?.phone || '',
        website: editClient?.website || '',
        industry: editClient?.industry || '',
        clientType: editClient?.clientType || '',
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
        location: editClient?.location || '',
        country: editClient?.country || '',
        employeeCount: editClient?.employeeCount || '',
        annualRevenue: editClient?.annualRevenue || '',
        customIndustry: editClient?.customIndustry || '',
    });

    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm(prev => ({ ...prev, [k]: e.target.value }));

    useEffect(() => {
        if (open) {
            setForm({
                name: editClient?.name || '',
                company: editClient?.company || '',
                email: editClient?.email || '',
                phone: editClient?.phone || '',
                website: editClient?.website || '',
                industry: editClient?.industry || '',
                clientType: editClient?.clientType || '',
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
                location: editClient?.location || '',
                country: editClient?.country || '',
                employeeCount: editClient?.employeeCount || '',
                annualRevenue: editClient?.annualRevenue || '',
                customIndustry: editClient?.customIndustry || '',
            });
            setIsCompany(!!editClient?.company);
        }
    }, [open, editClient]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.name.trim()) return toast.error('Client name is required');
        setLoading(true);
        try {
            const payload = {
                ...form,
                company: isCompany ? form.company : '',
                industry: isCompany ? form.industry : '',
                website: isCompany ? form.website : '',
                taxId: isCompany ? form.taxId : '',
                socialMediaLinks: { linkedin: isCompany ? form.linkedin : '' }
            };
            if (isEdit) {
                const { data } = await api.put(`/api/clients/${editClient.id}`, payload);
                toast.success('Client updated!');
                onSuccess(data.client);
            } else {
                const { data } = await api.post('/api/clients', payload);
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

    const phoneParts = (form.phone || '').trim().split(' ');
    let currentCode = '+1';
    let currentNum = form.phone || '';

    if (phoneParts.length > 0 && phoneParts[0].startsWith('+')) {
        currentCode = phoneParts[0];
        currentNum = phoneParts.slice(1).join(' ');
    }
    
    const handlePhoneCodeChange = (e: any) => {
        setForm({ ...form, phone: `${e.target.value} ${currentNum}`.trim() });
    };
    
    const handlePhoneNumChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const cleaned = e.target.value.replace(/[^\d\-\s()]/g, '');
        setForm({ ...form, phone: `${currentCode} ${cleaned}`.trim() });
    };

    return (
        <form onSubmit={handleSubmit}>
            <Drawer
                open={open}
                onClose={onClose}
                title={isEdit ? 'Edit Client' : 'Add Client'}
                icon={<Building2 className="w-5 h-5" />}
                footer={
                    <>
                        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                        <button type="submit" disabled={loading} className="btn-primary">
                            {loading ? <LogoLoader className="w-4 h-4 animate-spin" /> : isEdit ? 'Save Changes' : 'Add Client'}
                        </button>
                    </>
                }
            >
            <div className="mb-4 bg-gray-50/50 p-3 rounded-lg border border-gray-100 flex items-center justify-between">
                <div>
                    <h4 className="text-sm font-medium text-gray-900">Client Type</h4>
                    <p className="text-xs text-gray-500">Are you adding a company or an individual?</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={isCompany}
                        onChange={(e) => setIsCompany(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                    <span className="ml-3 text-sm font-medium text-gray-700">{isCompany ? 'Company' : 'Individual'}</span>
                </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label htmlFor="clientName" className="label">Contact Name *</label>
                    <input id="clientName" value={form.name} onChange={set('name')} placeholder="Jane Smith" className="input" required />
                </div>
                {isCompany && (
                    <div>
                        <label htmlFor="clientCompany" className="label">Company / Org Name *</label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                            <input id="clientCompany" value={form.company} onChange={set('company')} placeholder="Acme Corp" className="input pl-9" required={isCompany} />
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-3">
                <label htmlFor="contactPersonName" className="label">Primary Contact Person</label>
                <input id="contactPersonName" value={form.contactPersonName} onChange={set('contactPersonName')} placeholder="Full Name (if different from above)" className="input" />
            </div>

            <div className="grid grid-cols-2 gap-3">
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

            <div className="grid grid-cols-3 gap-3 border-t border-gray-100 pt-4 mt-2">
                <div>
                    <label htmlFor="clientType" className="label">Client Type</label>
                    <CustomSelect id="clientType" value={form.clientType} onChange={(e: any) => set('clientType')(e)} className="input">
                        <option value="">Select Type</option>
                        <option value="Enterprise">Enterprise</option>
                        <option value="Startup">Startup</option>
                        <option value="Individual">Individual</option>
                        <option value="Other">Other</option>
                    </CustomSelect>
                </div>
                {isCompany && (
                    <div>
                        <label htmlFor="clientIndustry" className="label">Industry</label>
                        <CustomSelect
                            label=""
                            value={form.industry}
                            onChange={(val: string) => setForm(prev => ({ ...prev, industry: val }))}
                            options={INDUSTRIES}
                            placeholder="Select or type..."
                            searchable={true}
                            creatable={true}
                        />
                    </div>
                )}
                <div>
                    <label htmlFor="clientStatus" className="label">Status</label>
                    <CustomSelect id="clientStatus" value={form.status} onChange={(e: any) => set('status')(e)} className="input">
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="lead">Lead / Prospect</option>
                    </CustomSelect>
                </div>
            </div>

            {isCompany && (
                <>
                    <div className="grid grid-cols-2 gap-3 mt-3">
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

                    <div className="mt-3">
                        <label htmlFor="clientTaxId" className="label">Tax ID / VAT No.</label>
                        <input id="clientTaxId" value={form.taxId} onChange={set('taxId')} placeholder="Optional" className="input" />
                    </div>
                </>
            )}

            <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                    <label htmlFor="clientAddress" className="label">Billing Address</label>
                    <input id="clientAddress" value={form.billingAddress} onChange={set('billingAddress')} placeholder="Full billing address..." className="input" />
                </div>
                <div>
                    <label htmlFor="shippingAddress" className="label">Shipping Address</label>
                    <input id="shippingAddress" value={form.shippingAddress} onChange={set('shippingAddress')} placeholder="Full shipping address..." className="input" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                    <label htmlFor="paymentTerms" className="label">Payment Terms</label>
                    <CustomSelect id="paymentTerms" value={form.paymentTerms} onChange={(e: any) => set('paymentTerms')(e)} className="input">
                        <option value="">Select Terms...</option>
                        <option value="Due on Receipt">Due on Receipt</option>
                        <option value="Net 15">Net 15</option>
                        <option value="Net 30">Net 30</option>
                        <option value="Net 45">Net 45</option>
                        <option value="Net 60">Net 60</option>
                    </CustomSelect>
                </div>
                <div>
                    <label htmlFor="currency" className="label">Currency</label>
                    <CustomSelect id="currency" value={form.currency} onChange={(e: any) => set('currency')(e)} className="input">
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="INR">INR (₹)</option>
                        <option value="AUD">AUD (A$)</option>
                        <option value="CAD">CAD (C$)</option>
                    </CustomSelect>
                </div>
            </div>

            {isCompany && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                        <label htmlFor="clientLocation" className="label">Location</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                            <input id="clientLocation" value={form.location} onChange={set('location')} placeholder="City, State" className="input pl-9" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="clientCountry" className="label">Country</label>
                        <input id="clientCountry" value={form.country} onChange={set('country')} placeholder="Country" className="input" />
                    </div>
                    <div>
                        <label htmlFor="clientEmployeeCount" className="label">Employee Count</label>
                        <div className="relative">
                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                            <input id="clientEmployeeCount" value={form.employeeCount} onChange={set('employeeCount')} placeholder="e.g. 50-200" className="input pl-9" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="clientAnnualRevenue" className="label">Annual Revenue</label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                            <input id="clientAnnualRevenue" type="number" min="0" value={form.annualRevenue} onChange={set('annualRevenue')} placeholder="0" className="input pl-9" />
                        </div>
                    </div>
                    <div className="col-span-2">
                        <label htmlFor="clientCustomIndustry" className="label">Custom Industry / Niche</label>
                        <div className="relative">
                            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                            <input id="clientCustomIndustry" value={form.customIndustry} onChange={set('customIndustry')} placeholder="Specific niche or sub-industry" className="input pl-9" />
                        </div>
                    </div>
                </div>
            )}

            {!isEdit && (
                <div className="border border-gray-100 rounded-lg p-4 mt-4 bg-gray-50/50">
                    <label className="flex items-center gap-2 cursor-pointer mb-3">
                        <input 
                            type="checkbox" 
                            className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                            checked={form.givePortalAccess}
                            onChange={(e) => setForm(prev => ({ ...prev, givePortalAccess: e.target.checked }))}
                        />
                        <span className="text-sm font-medium text-gray-700">Give Portal Access</span>
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
                            <p className="text-xs text-gray-500 mt-1">An email will be sent to the client with these credentials.</p>
                        </div>
                    )}
                </div>
            )}

            <div className="border-t border-gray-100 pt-4 mt-2">
                <label htmlFor="clientNotes" className="label">Internal Notes</label>
                <div className="relative">
                    <AlignLeft className="absolute left-3 top-3 w-4 h-4 text-gray-400" aria-hidden="true" />
                    <textarea id="clientNotes" value={form.notes} onChange={set('notes')} placeholder="Any relevant notes..." rows={3} className="input pl-9 resize-none" />
                </div>
            </div>
            </Drawer>
        </form>
    );
}
