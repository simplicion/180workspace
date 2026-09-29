'use client';

import { LogoLoader } from "@workspace/ui";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Save, Mail, Phone, MapPin, Hash, Globe,
    Image as ImageIcon, ArrowLeft, Building2, Check,
    FileText, Video, MessageSquare, Layers, Sparkles
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useSettings } from '@/lib/settings-context';
import { LocationSearch } from '@/components/ui/LocationSearch';

const SectionHeader = ({ icon: Icon, title }: { icon: any; title: string }) => (
    <div className="flex items-center gap-2 mb-5 pb-3 border-b border-gray-100 dark:border-gray-800 mt-8 first:mt-0">
        <Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
    </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
            {label}
        </label>
        {children}
    </div>
);

const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm";

export default function DocumentSettingsPage() {
    const router = useRouter();
    const { company, refreshSettings } = useSettings();
    const [loading, setLoading] = useState(false);
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
            } else if (company.country) {
                setLocationInput(company.country);
            }
        }
    }, [company]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await api.put('/api/company-config', formData);
            await refreshSettings(true);
            toast.success('Invoicing and company configuration saved successfully');
        } catch (error: any) {
            toast.error(error?.response?.data?.error || error?.response?.data?.message || 'Failed to save configuration');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-16">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/documents')}
                        title="Back to Documents"
                        aria-label="Back to Documents"
                        className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors cursor-pointer shadow-xs"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">System & Invoicing Settings</h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">System currency, white-labeling, and official billing address</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <a
                        href="/company"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors shadow-xs"
                        title="View Public Profile"
                    >
                        <Globe className="w-4 h-4 text-gray-500" />
                        View Public Profile
                    </a>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        title="Save all configuration changes"
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
                    >
                        {loading ? <LogoLoader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* Form Card */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 sm:p-8 shadow-xs space-y-0">

                {/* ── System Branding ── */}
                <SectionHeader icon={ImageIcon} title="System Branding" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="Brand Color">
                        <div className="flex gap-2.5">
                            <input 
                                type="color" 
                                name="brandColor" 
                                value={formData.brandColor} 
                                onChange={handleChange} 
                                title="Pick brand color"
                                aria-label="Brand color picker"
                                className="w-11 h-11 p-1 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer bg-white dark:bg-gray-850 shrink-0" 
                            />
                            <input 
                                name="brandColor" 
                                value={formData.brandColor} 
                                onChange={handleChange} 
                                className={`${inputCls} font-mono`} 
                                placeholder="#6366f1" 
                            />
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
                                    city: loc.city || prev.city,
                                    state: loc.state || prev.state,
                                    currency: loc.currencyCode,
                                    currencySymbol: loc.currencySymbol
                                }));
                            }}
                        />
                        <div className="mt-2 text-sm flex items-center text-gray-500 dark:text-gray-400">
                            <span>Primary Currency: </span>
                            <span className="font-bold text-gray-900 dark:text-gray-100 ml-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-md">
                                {formData.currency} ({formData.currencySymbol})
                            </span>
                        </div>
                    </Field>
                </div>

                {/* ── Support Contacts ── */}
                <SectionHeader icon={Mail} title="Support Contacts" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="Support Email">
                        <input 
                            name="supportEmail" 
                            value={formData.supportEmail} 
                            onChange={handleChange} 
                            className={inputCls} 
                            placeholder="support@example.com" 
                            title="Customer support email address" 
                        />
                    </Field>
                    <Field label="Phone Number">
                        <div className="relative">
                            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                                name="phoneNumber" 
                                value={formData.phoneNumber} 
                                onChange={handleChange} 
                                className={`${inputCls} pl-10`} 
                                placeholder="+1 098 765 432" 
                            />
                        </div>
                    </Field>
                </div>

                {/* ── Registered Address ── */}
                <SectionHeader icon={MapPin} title="Registered Address" />
                <div className="space-y-5">
                    <Field label="Full Address">
                        <textarea 
                            name="address" 
                            value={formData.address} 
                            onChange={handleChange} 
                            className={`${inputCls} min-h-[88px] resize-none`} 
                            placeholder="123 Business St, Suite 400, City, State, Zip Code" 
                            title="Company full address" 
                        />
                    </Field>
                </div>

                {/* ── Legal & Compliance ── */}
                <SectionHeader icon={Hash} title="Legal & Compliance" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="GST / VAT Number">
                        <input 
                            name="gstNumber" 
                            value={formData.gstNumber} 
                            onChange={handleChange} 
                            className={inputCls} 
                            placeholder="22AAAAA0000A1Z5" 
                        />
                    </Field>
                    <Field label="Registration Number">
                        <input 
                            name="registrationNumber" 
                            value={formData.registrationNumber} 
                            onChange={handleChange} 
                            className={inputCls} 
                            placeholder="Registration No." 
                            title="Company registration number" 
                        />
                    </Field>
                </div>

            </div>

            {/* ── Platform AI Consumption Rates ── */}
            <div id="ai-rates" className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 sm:p-8 shadow-xs space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800 flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200/60 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                            <Layers className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Platform AI Consumption Rates</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Predictable, transparent credit pricing across all 180 Workspace applications</p>
                        </div>
                    </div>
                    <span className="text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200/80 dark:border-purple-800 px-3 py-1.5 rounded-xl">
                        1 Credit = $0.001 USD (0.1¢)
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                    {[
                        { feature: "Document Full Architecture", cost: "10 Credits", icon: FileText, note: "Initial 8-12 AST block draft", highlight: true },
                        { feature: "Document Revision / Patch", cost: "1 Credit", icon: FileText, note: "10 revisions = 10 credits total", highlight: true },
                        { feature: "Autonomous Video Director", cost: "25 Credits", icon: Video, note: "Complete zero-footage edit with B-roll & voice" },
                        { feature: "Website Synthesis", cost: "20 Credits", icon: Globe, note: "Multi-section responsive site with tailwind styling" },
                        { feature: "AI Copilot Chat & Memory", cost: "1 Credit", icon: MessageSquare, note: "Real-time assistant inquiry" },
                        { feature: "Smart CRM Email Draft", cost: "2 Credits", icon: Mail, note: "Contextual lead follow-up generation" },
                    ].map((item, idx) => (
                        <div 
                            key={idx} 
                            className={`flex items-start gap-3.5 p-4 rounded-xl border transition-all ${
                                item.highlight 
                                    ? "bg-purple-50/50 dark:bg-purple-950/20 border-purple-200/80 dark:border-purple-800/60" 
                                    : "bg-gray-50/70 dark:bg-gray-800/40 border-gray-100 dark:border-gray-800"
                            }`}
                        >
                            <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 shadow-2xs">
                                <item.icon className="w-4 h-4" />
                            </div>
                            <div className="space-y-1 min-w-0">
                                <div className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">{item.feature}</div>
                                <div className="text-xs font-black text-purple-600 dark:text-purple-400 font-mono">{item.cost}</div>
                                <div className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">{item.note}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
