'use client';


import { LogoLoader } from "@workspace/ui";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Save, Mail, Phone, MapPin, Landmark, PenTool, Hash, Globe, Image as ImageIcon, ArrowLeft, Upload, Clock } from 'lucide-react';
import { SignaturePad } from '@/app/dashboard/(productivity-tools-app)/document-editor/_components/ui/SignaturePad';
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
                        onClick={() => router.push('/dashboard/settings/system-configs')}
                        title="Back to System Config"
                        aria-label="Back to System Config"
                        className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Company & Legals</h1>
                        <p className="text-gray-500 mt-1">Company identity, white-labeling, and legal details</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={loading}
                    title="Save all configuration changes"
                    className="btn-primary"
                >
                    {loading ? <LogoLoader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {loading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {/* Form Card */}
            <div className="card space-y-0 p-8">

                {/* ── Branding & Visuals ── */}
                <SectionHeader icon={ImageIcon} title="Branding & Visuals" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="Company Display Name">
                        <input name="companyName" value={formData.companyName} onChange={handleChange} className={inputCls} placeholder="e.g. Acme Corp" />
                    </Field>
                    <Field label="Tagline / Motto">
                        <input name="tagline" value={formData.tagline} onChange={handleChange} className={inputCls} placeholder="Precision in Management" />
                    </Field>
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
                    <Field label="Website URL">
                        <div className="relative">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input name="websiteUrl" value={formData.websiteUrl} onChange={handleChange} className={inputCls + ' pl-10'} placeholder="https://example.com" />
                        </div>
                    </Field>
                    <Field label="System Currency">
                        <div className="relative">
                            <input 
                                type="text"
                                name="currency" 
                                value={`${formData.currency} (${formData.currencySymbol})`} 
                                readOnly
                                className={`${inputCls} bg-gray-50 text-gray-500 cursor-not-allowed`}
                                title="Currency is set automatically based on company location"
                            />
                        </div>
                    </Field>
                    <Field label="Icon">
                        <label className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-gray-200 border-dashed rounded-2xl cursor-pointer hover:bg-gray-50 transition-colors bg-white overflow-hidden group">
                            {formData.companyLogo ? (
                                <img src={formData.companyLogo} alt="Icon Preview" className="w-full h-full object-contain p-2" />
                            ) : (
                                <div className="flex flex-col items-center justify-center text-gray-400 group-hover:text-indigo-500 transition-colors">
                                    {uploading === 'companyLogo' ? <LogoLoader className="w-6 h-6 animate-spin mb-2" /> : <Upload className="w-6 h-6 mb-2" />}
                                    <p className="text-xs font-semibold">Upload Icon</p>
                                </div>
                            )}
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleLogoUpload(e, 'companyLogo')} disabled={!!uploading} />
                        </label>
                    </Field>
                    <Field label="Logo">
                        <label className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-gray-200 border-dashed rounded-2xl cursor-pointer hover:bg-gray-50 transition-colors bg-white overflow-hidden group">
                            {formData.emailLogo ? (
                                <img src={formData.emailLogo} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                            ) : (
                                <div className="flex flex-col items-center justify-center text-gray-400 group-hover:text-indigo-500 transition-colors">
                                    {uploading === 'emailLogo' ? <LogoLoader className="w-6 h-6 animate-spin mb-2" /> : <Upload className="w-6 h-6 mb-2" />}
                                    <p className="text-xs font-semibold">Upload Logo</p>
                                </div>
                            )}
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleLogoUpload(e, 'emailLogo')} disabled={!!uploading} />
                        </label>
                    </Field>
                </div>

                {/* ── Contact Information ── */}
                <SectionHeader icon={Mail} title="Contact Information" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="Official Email">
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input name="companyEmail" value={formData.companyEmail} onChange={handleChange} className={inputCls + ' pl-10'} placeholder="contact@example.com" title="Official company email address" />
                        </div>
                    </Field>
                    <Field label="Support Email">
                        <input name="supportEmail" value={formData.supportEmail} onChange={handleChange} className={inputCls} placeholder="support@example.com" title="Customer support email address" />
                    </Field>
                    <Field label="Phone Number">
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} className={inputCls + ' pl-10'} placeholder="+1 234 567 890" />
                        </div>
                    </Field>
                    <Field label="Secondary Phone Number">
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input name="secondaryPhoneNumber" value={formData.secondaryPhoneNumber} onChange={handleChange} className={inputCls + ' pl-10'} placeholder="+1 098 765 432" />
                        </div>
                    </Field>
                </div>

                {/* ── Registered Address ── */}
                <SectionHeader icon={MapPin} title="Registered Address" />
                <div className="space-y-5">
                    <Field label="Street Address">
                        <textarea name="address" value={formData.address} onChange={handleChange} className={inputCls + ' min-h-[80px] resize-none'} placeholder="123 Business St, Suite 400" title="Company street address" />
                    </Field>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-3">
                            <Field label="City, State, Country">
                                <LocationSearch 
                                    value={locationInput}
                                    onChange={(loc) => {
                                        setLocationInput(loc.address);
                                        setFormData(prev => ({
                                            ...prev,
                                            city: loc.city,
                                            state: loc.state,
                                            country: loc.country,
                                            currency: loc.currencyCode,
                                            currencySymbol: loc.currencySymbol
                                        }));
                                    }}
                                />
                            </Field>
                        </div>
                        <Field label="Zip / Postal Code"><input name="postalCode" value={formData.postalCode} onChange={handleChange} className={inputCls} placeholder="Zip Code" title="Company zip code" /></Field>
                    </div>
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


                {/* ── HR & Document Signing ── */}
                <SectionHeader icon={PenTool} title="HR & Document Signing" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="Authorized Signatory Name">
                        <input name="authorizedSignatory" value={formData.authorizedSignatory} onChange={handleChange} className={inputCls} placeholder="John Doe" />
                    </Field>
                    <Field label="Designation">
                        <input name="designation" value={formData.designation} onChange={handleChange} className={inputCls} placeholder="Operations Manager" />
                    </Field>
                    <div className="col-span-full">
                        <Field label="Digital Signature">
                            <div className="mt-2 max-w-sm">
                                <SignaturePad 
                                    initialValue={formData.signatureImage} 
                                    onSave={(dataUrl) => setFormData(prev => ({ ...prev, signatureImage: dataUrl }))} 
                                    onClear={() => setFormData(prev => ({ ...prev, signatureImage: '' }))}
                                />
                            </div>
                            <p className="text-[10px] text-gray-400 font-medium mt-2">Used for automated salary slips and invoice generation.</p>
                        </Field>
                    </div>
                </div>

            </div>

            {/* Save is handled in header */}
        </div>
    );
}
