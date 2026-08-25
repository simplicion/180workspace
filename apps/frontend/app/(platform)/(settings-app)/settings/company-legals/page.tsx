'use client';


import { LogoLoader } from "@workspace/ui";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Save, Mail, Phone, MapPin, Landmark, PenTool, Hash, Globe, Image as ImageIcon, ArrowLeft, Upload, Clock } from 'lucide-react';
import { SignaturePad } from '@/app/(platform)/(workspace-tools-app)/document-editor/_components/ui/SignaturePad';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useSettings } from '@/lib/settings-context';
import { LocationSearch } from '@/components/ui/LocationSearch';

const SectionHeader = ({ icon: Icon, title }: { icon: any; title: string }) => (
    <div className="flex items-center gap-2 mb-5 pb-3 border-b border-gray-100 mt-8 first:mt-0">
        <Icon className="w-5 h-5 text-indigo-600" />
        <h3 className="font-semibold text-gray-900">{title}</h3>
    </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1.5">
        <label className="label">{label}</label>
        {children}
    </div>
);

const inputCls = "input bg-white";

export default function CompanyLegalsPage() {
    const router = useRouter();
    const { company, refreshSettings } = useSettings();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState<string | null>(null);
    const [locationInput, setLocationInput] = useState('');

    const [formData, setFormData] = useState({
        companyName: '',
        companyLogo: '',
        emailLogo: '',
        tagline: '',
        brandColor: '#6366f1',
        currency: 'USD',
        currencySymbol: '$',
        websiteUrl: '',
        companyEmail: '',
        supportEmail: '',
        phoneNumber: '',
        secondaryPhoneNumber: '',
        address: '',
        city: '',
        state: '',
        country: '',
        postalCode: '',
        gstNumber: '',
        registrationNumber: '',
        bankName: '',
        accountHolderName: '',
        bankAccountNumber: '',
        ifscCode: '',
        authorizedSignatory: '',
        designation: '',
        signatureImage: ''
    });

    useEffect(() => {
        if (company) {
            setFormData({
                companyName: company.companyName || '',
                companyLogo: company.companyLogo || '',
                emailLogo: company.emailLogo || '',
                tagline: company.tagline || '',
                brandColor: company.brandColor || '#6366f1',
                currency: company.currency || 'USD',
                currencySymbol: company.currencySymbol || '$',
                websiteUrl: company.websiteUrl || '',
                companyEmail: company.companyEmail || '',
                supportEmail: company.supportEmail || '',
                phoneNumber: company.phoneNumber || '',
                secondaryPhoneNumber: (company as any).secondaryPhoneNumber || '',
                address: company.address || '',
                city: company.city || '',
                state: company.state || '',
                country: company.country || '',
                postalCode: company.postalCode || '',
                gstNumber: company.gstNumber || '',
                registrationNumber: company.registrationNumber || '',
                bankName: company.bankName || '',
                accountHolderName: company.accountHolderName || '',
                bankAccountNumber: company.bankAccountNumber || '',
                ifscCode: company.ifscCode || '',
                authorizedSignatory: company.authorizedSignatory || (company as any).adminName || '',
                designation: company.designation || 'Company Founder and CEO',
                signatureImage: company.signatureImage || ''
            });
            const locParts = [company.city, company.state, company.country].filter(Boolean);
            if (locParts.length > 0) {
                setLocationInput(locParts.join(', '));
            }
        }
    }, [company]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'companyLogo' | 'emailLogo' | 'signatureImage') => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error('File size must be less than 5MB');
            return;
        }

        setUploading(field);
        const data = new FormData();
        data.append('file', file);

        try {
            const res = await api.post('/api/branding/logo', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setFormData(prev => ({ ...prev, [field]: res.data.url }));
            toast.success('Image uploaded successfully');
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(null);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await api.put('/api/company-config', formData);
            await refreshSettings(true);
            toast.success('Company configuration saved successfully');
        } catch (error: any) {
            toast.error(error?.response?.data?.error || 'Failed to save');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/settings/system-configs')}
                        title="Back to System Config"
                        aria-label="Back to System Config"
                        className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">System & Invoicing Settings</h1>
                        <p className="text-gray-500 mt-1">System currency, white-labeling, and official billing address</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <a
                        href="/company"
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary flex items-center gap-2"
                        title="View Public Profile"
                    >
                        <Globe className="w-4 h-4" />
                        View Public Profile
                    </a>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        title="Save all configuration changes"
                        className="btn-primary flex items-center gap-2"
                    >
                        {loading ? <LogoLoader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* Form Card */}
            <div className="card space-y-0 p-8">

                {/* ── System Branding ── */}
                <SectionHeader icon={ImageIcon} title="System Branding" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="Brand Color">
                        <div className="flex gap-2">
                            <input 
                                type="color" 
                                name="brandColor" 
                                value={formData.brandColor} 
                                onChange={handleChange} 
                                title="Pick brand color"
                                aria-label="Brand color picker"
                                className="w-11 h-11 p-1 rounded-xl border border-gray-200 cursor-pointer bg-white" 
                            />
                            <input name="brandColor" value={formData.brandColor} onChange={handleChange} className={inputCls + ' flex-1 font-mono'} placeholder="#6366f1" />
                        </div>
                    </Field>

                    <Field label="Country & Currency">
                        <LocationSearch 
                            value={locationInput}
                            onChange={(loc) => {
                                setLocationInput(loc.country || loc.address);
                                setFormData(prev => ({
                                    ...prev,
                                    country: loc.country,
                                    currency: loc.currencyCode,
                                    currencySymbol: loc.currencySymbol
                                }));
                            }}
                        />
                        <div className="mt-2 text-sm flex items-center text-gray-500">
                            <span>Primary Currency: </span>
                            <span className="font-bold text-gray-900 ml-1 px-2 py-0.5 bg-gray-100 rounded-md">
                                {formData.currency} ({formData.currencySymbol})
                            </span>
                        </div>
                    </Field>

                </div>

                {/* ── Support Contacts ── */}
                <SectionHeader icon={Mail} title="Support Contacts" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="Support Email">
                        <input name="supportEmail" value={formData.supportEmail} onChange={handleChange} className={inputCls} placeholder="support@example.com" title="Customer support email address" />
                    </Field>
                    <Field label="Phone Number">
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} className={inputCls + ' pl-10'} placeholder="+1 098 765 432" />
                        </div>
                    </Field>
                </div>

                {/* ── Registered Address ── */}
                <SectionHeader icon={MapPin} title="Registered Address" />
                <div className="space-y-5">
                    <Field label="Full Address">
                        <textarea name="address" value={formData.address} onChange={handleChange} className={inputCls + ' min-h-[80px] resize-none'} placeholder="123 Business St, Suite 400, City, State, Zip Code" title="Company full address" />
                    </Field>
                </div>

                {/* ── Legal & Compliance ── */}
                <SectionHeader icon={Hash} title="Legal & Compliance" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="GST / VAT Number">
                        <input name="gstNumber" value={formData.gstNumber} onChange={handleChange} className={inputCls} placeholder="22AAAAA0000A1Z5" />
                    </Field>
                    <Field label="Registration Number">
                        <input name="registrationNumber" value={formData.registrationNumber} onChange={handleChange} className={inputCls} placeholder="Registration No." title="Company registration number" />
                    </Field>
                </div>




            </div>

            {/* Save is handled in header */}
        </div>
    );
}
