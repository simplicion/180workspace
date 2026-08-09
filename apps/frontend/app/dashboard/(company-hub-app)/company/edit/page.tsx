"use client";

import { LogoLoader } from "@workspace/ui";
import React, { useState, useEffect } from 'react';
import { useGetPrivateCompanyProfileQuery, useUpdateCompanyProfileMutation } from '@redux/api/companyApi';

import toast from 'react-hot-toast';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSettings } from '@/lib/settings-context';
import EmailTab from '@/app/dashboard/(settings-app)/_components/EmailTab';
import api from '@/lib/api';

export default function EditCompanyProfilePage() {
    const router = useRouter();
    const { company: settingsCompany } = useSettings();
    const currencySymbol = settingsCompany?.currencySymbol || '$';
    const { data: profileResponse, isLoading } = useGetPrivateCompanyProfileQuery(undefined);
    const [updateProfile, { isLoading: isUpdating }] = useUpdateCompanyProfileMutation();

    const [activeTab, setActiveTab] = useState('basic');
    const [isVerifyingDomain, setIsVerifyingDomain] = useState(false);
    const [formData, setFormData] = useState<any>({
        name: '', oneLineDescription: '', aboutUs: '', industry: '', startupStage: '',
        headquarters: '', website: '', email: '', phone: '',
        companyType: 'B2B', foundedDate: '', teamSize: '', logoUrl: '', bannerUrl: '',
        totalFunding: '', fundingStage: '', annualRevenue: '', burnRate: '',
        topRecognition: '', productsBuilt: '', happyClients: '',
        privacySettings: { hideFinancials: false, hideTeamSize: false },
        slug: '', customDomain: ''
    });

    useEffect(() => {
        if (profileResponse?.data) {
            const c = profileResponse.data;
            setFormData({
                name: c.name || '',
                oneLineDescription: c.oneLineDescription || '',
                aboutUs: c.aboutUs || '',
                industry: c.industry || '',
                startupStage: c.startupStage || '',
                headquarters: c.headquarters || '',
                website: c.website || '',
                email: c.email || '',
                phone: c.phone || '',
                companyType: c.companyType || 'B2B',
                foundedDate: c.foundedDate ? new Date(c.foundedDate).toISOString().split('T')[0] : '',
                teamSize: c.teamSize || '',
                logoUrl: c.logoUrl || '',
                bannerUrl: c.bannerUrl || '',
                totalFunding: c.totalFunding || '',
                fundingStage: c.fundingStage || '',
                annualRevenue: c.annualRevenue || '',
                burnRate: c.burnRate || '',
                topRecognition: c.topRecognition || '',
                productsBuilt: c.productsBuilt || '',
                happyClients: c.happyClients || '',
                privacySettings: c.privacySettings || { hideFinancials: false, hideTeamSize: false },
                slug: c.slug || '',
                customDomain: c.customDomain || ''
            });
        }
    }, [profileResponse]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleTogglePrivacy = (field: string) => {
        setFormData((prev: any) => ({
            ...prev,
            privacySettings: {
                ...prev.privacySettings,
                [field]: !prev.privacySettings[field]
            }
        }));
    };

    const handleVerifyDomain = async () => {
        if (!formData.customDomain) return;
        setIsVerifyingDomain(true);
        try {
            const res = await api.post('/api/company-profile/private/verify-domain', { domain: formData.customDomain });
            if (res.data.success) {
                toast.success(res.data.message || 'Domain verified successfully!');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to verify domain. Check DNS settings.');
        } finally {
            setIsVerifyingDomain(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const dataToSubmit = {
                ...formData,
                foundedDate: formData.foundedDate ? new Date(formData.foundedDate).toISOString() : null,
                teamSize: formData.teamSize || null
            };
            await updateProfile(dataToSubmit).unwrap();
            toast.success("Company profile updated successfully");
        } catch (error) {
            toast.error("Failed to update profile");
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <LogoLoader className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 border rounded hover:bg-gray-100">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold">Edit Company Profile</h1>
                        <p className="text-gray-500 text-sm">Manage your public information and privacy settings.</p>
                    </div>
                </div>
                <button 
                    onClick={handleSubmit} 
                    disabled={isUpdating}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                    {isUpdating ? <LogoLoader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Changes
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-64 space-y-1">
                    {[
                        { id: 'basic', label: 'Basic Info' },
                        { id: 'contact', label: 'Contact & Social' },
                        { id: 'financials', label: 'Financials & Stats' },
                        { id: 'privacy', label: 'Privacy Settings' },
                        { id: 'smtp', label: 'Email Integration' },
                        { id: 'web', label: 'Web Configuration' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`block w-full text-left px-4 py-2 rounded text-sm ${activeTab === tab.id ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-100'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 bg-white border rounded p-6 shadow-sm">
                    {activeTab === 'basic' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium">Company Name</label>
                                <input name="name" value={formData.name} onChange={handleInputChange} className="w-full p-2 border rounded" required />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium">One Line Description</label>
                                <input name="oneLineDescription" value={formData.oneLineDescription} onChange={handleInputChange} className="w-full p-2 border rounded" placeholder="E.g. We build great software." />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium">About Us</label>
                                <textarea name="aboutUs" value={formData.aboutUs} onChange={handleInputChange} className="w-full p-2 border rounded" rows={5} placeholder="Full description of the company..." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium">Industry</label>
                                    <input name="industry" value={formData.industry} onChange={handleInputChange} className="w-full p-2 border rounded" placeholder="E.g. SaaS, FinTech" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium">Company Type</label>
                                    <select name="companyType" value={formData.companyType} onChange={handleInputChange} className="w-full p-2 border rounded">
                                        <option value="B2B">B2B</option>
                                        <option value="B2C">B2C</option>
                                        <option value="B2B2C">B2B2C</option>
                                        <option value="D2C">D2C</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium">Startup Stage</label>
                                    <input name="startupStage" value={formData.startupStage} onChange={handleInputChange} className="w-full p-2 border rounded" placeholder="E.g. Seed, Series A" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium">Founded Date</label>
                                    <input type="date" name="foundedDate" value={formData.foundedDate} onChange={handleInputChange} className="w-full p-2 border rounded" />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'contact' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold mb-4">Contact & Social</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium">Headquarters</label>
                                    <input name="headquarters" value={formData.headquarters} onChange={handleInputChange} className="w-full p-2 border rounded" placeholder="San Francisco, CA" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium">Website</label>
                                    <input name="website" type="url" value={formData.website} onChange={handleInputChange} className="w-full p-2 border rounded" placeholder="https://example.com" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium">Public Email</label>
                                    <input name="email" type="email" value={formData.email} onChange={handleInputChange} className="w-full p-2 border rounded" placeholder="contact@example.com" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium">Phone</label>
                                    <input name="phone" type="tel" value={formData.phone} onChange={handleInputChange} className="w-full p-2 border rounded" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium">Logo URL</label>
                                    <input name="logoUrl" type="url" value={formData.logoUrl} onChange={handleInputChange} className="w-full p-2 border rounded" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium">Banner URL</label>
                                    <input name="bannerUrl" type="url" value={formData.bannerUrl} onChange={handleInputChange} className="w-full p-2 border rounded" />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'financials' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold mb-4">Financials & Highlights</h2>
                            <p className="text-sm text-gray-500 mb-4">This information can be hidden from the public view in the Privacy tab.</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-4">
                                    <label className="block text-sm font-medium text-gray-700">Total Funding</label>
                                    <input name="totalFunding" value={formData.totalFunding} onChange={handleInputChange} className="w-full p-2 border rounded" placeholder={`E.g. ${currencySymbol}5M`} />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium">Funding Stage</label>
                                    <input name="fundingStage" value={formData.fundingStage} onChange={handleInputChange} className="w-full p-2 border rounded" placeholder="E.g. Series A" />
                                </div>
                                <div className="space-y-4">
                                    <label className="block text-sm font-medium text-gray-700">Annual Revenue (ARR)</label>
                                    <input name="annualRevenue" value={formData.annualRevenue} onChange={handleInputChange} className="w-full p-2 border rounded" placeholder={`E.g. ${currencySymbol}1M ARR`} />
                                </div>
                                <div className="space-y-4">
                                    <label className="block text-sm font-medium text-gray-700">Burn Rate (Monthly)</label>
                                    <input name="burnRate" value={formData.burnRate} onChange={handleInputChange} className="w-full p-2 border rounded" placeholder={`E.g. ${currencySymbol}50k/mo`} />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium">Team Size</label>
                                    <input name="teamSize" type="number" value={formData.teamSize} onChange={handleInputChange} className="w-full p-2 border rounded" placeholder="E.g. 25" />
                                </div>
                            </div>
                            <h3 className="text-md font-semibold mt-6 mb-2">Highlights</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium">Top Recognition</label>
                                    <input name="topRecognition" value={formData.topRecognition} onChange={handleInputChange} className="w-full p-2 border rounded" placeholder="E.g. Forbes 30 Under 30" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium">Products Built</label>
                                    <input name="productsBuilt" value={formData.productsBuilt} onChange={handleInputChange} className="w-full p-2 border rounded" placeholder="E.g. 5" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium">Happy Clients</label>
                                    <input name="happyClients" value={formData.happyClients} onChange={handleInputChange} className="w-full p-2 border rounded" placeholder="E.g. 100+" />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'privacy' && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold mb-4">Privacy Settings</h2>
                            <div className="flex items-center justify-between p-4 border rounded">
                                <div>
                                    <h3 className="font-medium">Hide Financials</h3>
                                    <p className="text-sm text-gray-500">Hide funding, revenue, and burn rate on public profile.</p>
                                </div>
                                <button 
                                    onClick={() => handleTogglePrivacy('hideFinancials')}
                                    className={`w-12 h-6 rounded-full relative transition-colors ${formData.privacySettings.hideFinancials ? 'bg-blue-600' : 'bg-gray-300'}`}
                                >
                                    <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.privacySettings.hideFinancials ? 'translate-x-6' : 'translate-x-0'}`} />
                                </button>
                            </div>
                            <div className="flex items-center justify-between p-4 border rounded">
                                <div>
                                    <h3 className="font-medium">Hide Team Size</h3>
                                    <p className="text-sm text-gray-500">Do not display exact team size on public profile.</p>
                                </div>
                                <button 
                                    onClick={() => handleTogglePrivacy('hideTeamSize')}
                                    className={`w-12 h-6 rounded-full relative transition-colors ${formData.privacySettings.hideTeamSize ? 'bg-blue-600' : 'bg-gray-300'}`}
                                >
                                    <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.privacySettings.hideTeamSize ? 'translate-x-6' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'smtp' && (
                        <div className="space-y-6 -m-6">
                            <EmailTab 
                                title="Company Email Integration" 
                                description="Configure your company's SMTP credentials. These will be used when sending emails on behalf of your company (e.g. sending candidate rejections, marketing emails, or client notifications)." 
                            />
                        </div>
                    )}

                    {activeTab === 'web' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold mb-4">Web Configuration</h2>
                            <p className="text-sm text-gray-500 mb-6">Manage how your workspace and websites are accessed.</p>
                            
                            <div className="space-y-6">
                                <div className="space-y-2 p-4 border rounded-xl bg-gray-50">
                                    <label className="block text-sm font-bold">Workspace Subdomain (Company ID)</label>
                                    <p className="text-xs text-gray-500 mb-2">This is the unique identifier for your workspace. It serves as your subdomain.</p>
                                    <div className="flex items-center">
                                        <input 
                                            name="slug" 
                                            value={formData.slug} 
                                            onChange={handleInputChange} 
                                            className="flex-1 p-2 border rounded-l focus:outline-none focus:border-blue-500" 
                                            placeholder="your-company-name"
                                            pattern="[a-z0-9-]+"
                                            title="Only lowercase letters, numbers, and hyphens are allowed."
                                        />
                                        <span className="bg-gray-200 border border-l-0 rounded-r px-3 py-2 text-sm text-gray-600 font-mono">
                                            .{process.env.NEXT_PUBLIC_ROOT_DOMAIN || (process.env.NODE_ENV === 'production' ? '180workspace.com' : 'localhost:3002')}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="space-y-2 p-4 border rounded-xl bg-blue-50/50">
                                    <label className="block text-sm font-bold">Custom Domain</label>
                                    <p className="text-xs text-gray-500 mb-2">Connect your own domain to serve your websites directly from it.</p>
                                    <input 
                                        name="customDomain" 
                                        value={formData.customDomain} 
                                        onChange={handleInputChange} 
                                        className="w-full p-2 border rounded focus:outline-none focus:border-blue-500" 
                                        placeholder="e.g. www.yourbrand.com" 
                                    />
                                    {formData.customDomain && (
                                        <div className="mt-4 p-4 bg-blue-100/50 rounded-lg text-sm text-blue-800 space-y-3 border border-blue-200">
                                            <div>
                                                <p className="font-semibold mb-1">DNS Configuration Instructions:</p>
                                                <ul className="list-disc pl-5 space-y-1 text-xs text-blue-700">
                                                    <li>Add a CNAME record pointing <strong>{formData.customDomain.replace(/^www\./, '')}</strong> (or www) to <strong>cname.{process.env.NEXT_PUBLIC_ROOT_DOMAIN || (process.env.NODE_ENV === 'production' ? '180workspace.com' : 'localhost:3002')}</strong></li>
                                                    <li>Note: SSL certificates are automatically provisioned by Cloudflare for SaaS.</li>
                                                </ul>
                                            </div>
                                            <button 
                                                onClick={handleVerifyDomain}
                                                disabled={isVerifyingDomain}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                                type="button"
                                            >
                                                {isVerifyingDomain ? 'Verifying...' : 'Verify Domain'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
