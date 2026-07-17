'use client';


import { LogoLoader } from "@workspace/ui";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Save, Mail, Phone, MapPin, Landmark, PenTool, Hash, Globe, Image as ImageIcon, ArrowLeft, Upload, Clock } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useSettings } from '@/lib/settings-context';


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

    const [formData, setFormData] = useState({
        companyName: '',
        companyLogo: '',
        emailLogo: '',
        tagline: '',
        brandColor: '#6366f1',
        websiteUrl: '',
        companyEmail: '',
        supportEmail: '',
        phoneNumber: '',
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
        signatureImage: '',
        salaryReleaseDate: 1,
        workingDaysPerMonth: 22,
        standardStartTime: '09:00',
        standardEndTime: '18:00',
        gracePeriod: 15
    });

    useEffect(() => {
        if (company) {
            setFormData({
                companyName: company.companyName || '',
                companyLogo: company.companyLogo || '',
                emailLogo: company.emailLogo || '',
                tagline: company.tagline || '',
                brandColor: company.brandColor || '#6366f1',
                websiteUrl: company.websiteUrl || '',
                companyEmail: company.companyEmail || '',
                supportEmail: company.supportEmail || '',
                phoneNumber: company.phoneNumber || '',
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
                authorizedSignatory: company.authorizedSignatory || '',
                designation: company.designation || '',
                signatureImage: company.signatureImage || '',
                salaryReleaseDate: company.salaryReleaseDate || 1,
                workingDaysPerMonth: company.workingDaysPerMonth || 22,
                standardStartTime: company.standardStartTime || '09:00',
                standardEndTime: company.standardEndTime || '18:00',
                gracePeriod: company.gracePeriod || 15
            });
        }
    }, [company]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'companyLogo' | 'emailLogo') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(field);
        const data = new FormData();
        data.append('file', file);

        try {
            const res = await api.post('/api/branding/logo', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setFormData(prev => ({ ...prev, [field]: res.data.url }));
            toast.success('Logo uploaded and linked');
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
                        <p className="text-gray-500 mt-1">Company identity, white-labeling, legal, and banking details</p>
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
                    <Field label="Dashboard Logo">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input name="companyLogo" value={formData.companyLogo} onChange={handleChange} className={inputCls} placeholder="https://..." />
                            </div>
                            <label className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-100 transition-all text-xs font-bold text-gray-600">
                                {uploading === 'companyLogo' ? <LogoLoader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                <span>Upload</span>
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleLogoUpload(e, 'companyLogo')} disabled={!!uploading} />
                            </label>
                        </div>
                        {formData.companyLogo && <img src={formData.companyLogo} alt="Logo Preview" className="h-10 mt-2 object-contain rounded-lg border border-gray-100 p-1 bg-white" />}
                    </Field>
                    <Field label="Email Header Logo">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input name="emailLogo" value={formData.emailLogo} onChange={handleChange} className={inputCls} placeholder="https://..." />
                            </div>
                            <label className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-100 transition-all text-xs font-bold text-gray-600">
                                {uploading === 'emailLogo' ? <LogoLoader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                <span>Upload</span>
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleLogoUpload(e, 'emailLogo')} disabled={!!uploading} />
                            </label>
                        </div>
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
                </div>

                {/* ── Registered Address ── */}
                <SectionHeader icon={MapPin} title="Registered Address" />
                <div className="space-y-5">
                    <Field label="Street Address">
                        <textarea name="address" value={formData.address} onChange={handleChange} className={inputCls + ' min-h-[80px] resize-none'} placeholder="123 Business St, Suite 400" title="Company street address" />
                    </Field>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Field label="City"><input name="city" value={formData.city} onChange={handleChange} className={inputCls} placeholder="City" title="Company city" /></Field>
                        <Field label="State / Province"><input name="state" value={formData.state} onChange={handleChange} className={inputCls} placeholder="State" title="Company state/province" /></Field>
                        <Field label="Country"><input name="country" value={formData.country} onChange={handleChange} className={inputCls} placeholder="Country" title="Company country" /></Field>
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

                {/* ── Banking Details ── */}
                <SectionHeader icon={Landmark} title="Banking Details (For Invoices / Salaries)" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="Bank Name"><input name="bankName" value={formData.bankName} onChange={handleChange} className={inputCls} placeholder="Bank Name" title="Bank name" /></Field>
                    <Field label="Account Holder Name"><input name="accountHolderName" value={formData.accountHolderName} onChange={handleChange} className={inputCls} placeholder="Account Holder" title="Bank account holder name" /></Field>
                    <Field label="Account Number"><input name="bankAccountNumber" value={formData.bankAccountNumber} onChange={handleChange} className={inputCls} placeholder="Account Number" title="Bank account number" /></Field>
                    <Field label="IFSC / Swift Code"><input name="ifscCode" value={formData.ifscCode} onChange={handleChange} className={inputCls} placeholder="IFSC/Swift" title="Bank IFSC or Swift code" /></Field>
                </div>

                {/* ── Attendance & Timing Settings ── */}
                <SectionHeader icon={Clock} title="Attendance & Shift Settings" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="Standard Login Time (HH:MM)">
                        <input type="time" name="standardStartTime" value={formData.standardStartTime} onChange={handleChange} className={inputCls} title="Standard login time" />
                        <p className="text-[10px] text-gray-400 font-medium mt-1">Daily check-in goal. Late marks after grace period.</p>
                    </Field>
                    <Field label="Standard Logout Time (HH:MM)">
                        <input type="time" name="standardEndTime" value={formData.standardEndTime} onChange={handleChange} className={inputCls} title="Standard logout time" />
                        <p className="text-[10px] text-gray-400 font-medium mt-1">Daily check-out time. Used for auto-checkout calculation.</p>
                    </Field>
                    <Field label="Late Grace Period (Minutes)">
                        <input type="number" min="0" name="gracePeriod" value={formData.gracePeriod} onChange={handleChange} className={inputCls} placeholder="15" />
                    </Field>
                </div>

                {/* ── Payroll Settings ── */}
                <SectionHeader icon={Landmark} title="Payroll Settings" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="Salary Release Date (1–28)">
                        <input type="number" min="1" max="28" name="salaryReleaseDate" value={formData.salaryReleaseDate} onChange={handleChange} className={inputCls} placeholder="1" />
                        <p className="text-[10px] text-gray-400 font-medium mt-1">The day of the month when salaries are released.</p>
                    </Field>
                    <Field label="Working Days Per Month">
                        <input type="number" min="1" max="31" name="workingDaysPerMonth" value={formData.workingDaysPerMonth} onChange={handleChange} className={inputCls} placeholder="22" />
                        <p className="text-[10px] text-gray-400 font-medium mt-1">Used to calculate daily salary deductions for absences.</p>
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
                        <Field label="Signature Image URL (Transparent PNG)">
                            <input name="signatureImage" value={formData.signatureImage} onChange={handleChange} className={inputCls} placeholder="https://..." />
                            {formData.signatureImage && <img src={formData.signatureImage} alt="Signature Preview" className="h-16 mt-2 object-contain rounded-lg bg-white border border-gray-100 p-1" />}
                            <p className="text-[10px] text-gray-400 font-medium mt-1">Used for automated salary slips and invoice generation.</p>
                        </Field>
                    </div>
                </div>

            </div>

            {/* Footer Save */}
            <div className="flex justify-end pt-6">
                <button
                    onClick={handleSave}
                    disabled={loading}
                    title="Save current configuration"
                    className="flex items-center gap-2 px-10 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all disabled:opacity-50"
                >
                    {loading ? <LogoLoader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {loading ? 'Saving Changes...' : 'Save Configuration'}
                </button>
            </div>
        </div>
    );
}
