"use client";

import { LogoLoader } from "@workspace/ui";
import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Building, Globe, MapPin, Mail, Phone, Calendar, Briefcase, Users, Trophy, Target, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

interface CompanyOverviewEditModalProps {
    company: any;
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
}

export function CompanyOverviewEditModal({ company, isOpen, onClose, onSave }: CompanyOverviewEditModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [newTag, setNewTag] = useState('');

    let meta: any = {};
    try { meta = typeof company?.metadata === 'string' ? JSON.parse(company.metadata) : (company?.metadata || {}); } catch(e) {}
    
    let parsedTags: string[] = [];
    if (company?.tagline) {
        parsedTags = company.tagline.split(',').map((t: string) => t.trim()).filter(Boolean);
    } else if (meta?.tags) {
        parsedTags = Array.isArray(meta.tags) ? meta.tags : [];
    }

    let parsedSocials: any = {};
    try { parsedSocials = typeof company?.socialLinks === 'string' ? JSON.parse(company.socialLinks) : (company?.socialLinks || {}); } catch(e) {}

    const [formData, setFormData] = useState({
        aboutUs: company?.aboutUs || '',
        name: company?.name || '',
        country: company?.country || '',
        headquarters: company?.headquarters || '',
        otherOffices: company?.otherOffices || '',
        adminEmail: company?.adminEmail || '',
        adminPhone: company?.adminPhone || '',
        website: company?.website || '',
        industry: company?.industry || '',
        companyType: company?.companyType || '',
        teamSize: company?.teamSize || '1-10',
        foundedDate: company?.foundedDate ? new Date(company.foundedDate).toISOString().split('T')[0] : '',
        productsBuilt: company?.productsBuilt || '',
        happyClients: company?.happyClients || '',
        socialLinks: parsedSocials,
        tags: parsedTags,
    });

    useEffect(() => {
        if (isOpen && company) {
            let m: any = {};
            try { m = typeof company.metadata === 'string' ? JSON.parse(company.metadata) : (company.metadata || {}); } catch(e) {}
            
            let t: string[] = [];
            if (company.tagline) {
                t = company.tagline.split(',').map((s: string) => s.trim()).filter(Boolean);
            } else if (m.tags && Array.isArray(m.tags)) {
                t = m.tags;
            }

            let s: any = {};
            try { s = typeof company.socialLinks === 'string' ? JSON.parse(company.socialLinks) : (company.socialLinks || {}); } catch(e) {}

            setFormData({
                aboutUs: company.aboutUs || '',
                name: company.name || '',
                country: company.country || '',
                headquarters: company.headquarters || '',
                otherOffices: company.otherOffices || '',
                adminEmail: company.adminEmail || '',
                adminPhone: company.adminPhone || '',
                website: company.website || '',
                industry: company.industry || '',
                companyType: company.companyType || '',
                teamSize: company.teamSize || '1-10',
                foundedDate: company.foundedDate ? new Date(company.foundedDate).toISOString().split('T')[0] : '',
                productsBuilt: company.productsBuilt || '',
                happyClients: company.happyClients || '',
                socialLinks: s,
                tags: t,
            });
        }
    }, [isOpen, company]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSocialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            socialLinks: {
                ...prev.socialLinks,
                [name]: value
            }
        }));
    };

    const addTag = () => {
        const trimmed = newTag.trim();
        if (trimmed && !formData.tags.includes(trimmed)) {
            setFormData(prev => ({ ...prev, tags: [...prev.tags, trimmed] }));
            setNewTag('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tagToRemove) }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const dataToSave = {
                name: formData.name.trim(),
                aboutUs: formData.aboutUs,
                tagline: formData.tags.join(', '),
                tags: formData.tags,
                country: formData.country.trim(),
                headquarters: formData.headquarters.trim(),
                otherOffices: formData.otherOffices.trim(),
                adminEmail: formData.adminEmail.trim(),
                adminPhone: formData.adminPhone.trim(),
                website: formData.website.trim(),
                industry: formData.industry.trim(),
                companyType: formData.companyType.trim(),
                teamSize: formData.teamSize,
                foundedDate: formData.foundedDate ? new Date(formData.foundedDate).toISOString() : null,
                productsBuilt: formData.productsBuilt ? String(formData.productsBuilt).trim() : '0',
                happyClients: formData.happyClients ? String(formData.happyClients).trim() : '0',
                socialLinks: formData.socialLinks,
                metadata: {
                    ...meta,
                    tags: formData.tags,
                    responseTime: formData.socialLinks.responseTime || '',
                }
            };

            await onSave(dataToSave);
            toast.success('Overview details saved successfully!');
            onClose();
        } catch (error: any) {
            console.error('Failed to save overview data', error);
            toast.error(error?.response?.data?.message || 'Failed to save overview details');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={onClose} />
            
            <div className="relative bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center">
                            <Building className="w-5 h-5 mr-2 text-blue-600" />
                            Edit Overview Details
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Update your company description, metrics, contact info, and social links.
                        </p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <form id="overview-edit-form" onSubmit={handleSubmit} className="space-y-6">
                        {/* About Us */}
                        <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-200/80">
                            <label className="block text-sm font-bold text-gray-900 mb-1.5">
                                About Company
                            </label>
                            <textarea 
                                name="aboutUs" 
                                value={formData.aboutUs} 
                                onChange={handleChange} 
                                rows={4} 
                                placeholder="Describe your company, mission, what you build, and why customers love you..."
                                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-xs"
                            />
                        </div>

                        {/* Tags / Specialties */}
                        <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-200/80">
                            <label className="block text-sm font-bold text-gray-900 mb-1.5">
                                Services & Specialties (Tags)
                            </label>
                            <div className="flex gap-2 mb-3">
                                <input 
                                    type="text" 
                                    value={newTag} 
                                    onChange={e => setNewTag(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                                    className="flex-1 px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-xs"
                                    placeholder="e.g. SaaS, Artificial Intelligence, FinTech, B2B"
                                />
                                <button 
                                    type="button" 
                                    onClick={addTag} 
                                    className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium text-sm transition-colors shadow-xs flex items-center"
                                >
                                    <Plus className="w-4 h-4 mr-1" /> Add
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2 min-h-[32px] p-2 bg-white border border-gray-200 rounded-xl">
                                {formData.tags.length === 0 && (
                                    <span className="text-xs text-gray-400 italic">No tags added yet. Type above and click Add.</span>
                                )}
                                {formData.tags.map((tag: string) => (
                                    <span key={tag} className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-200 shadow-xs">
                                        {tag}
                                        <button 
                                            type="button" 
                                            onClick={() => removeTag(tag)} 
                                            className="ml-1.5 p-0.5 text-blue-400 hover:text-blue-700 hover:bg-blue-100 rounded-full transition-colors"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Company Details */}
                        <div>
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                                <Building className="w-4 h-4 mr-1.5 text-blue-600" />
                                Company Details
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Legal Name</label>
                                    <input 
                                        type="text" 
                                        name="name" 
                                        value={formData.name} 
                                        onChange={handleChange} 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                                        placeholder="e.g. Simplicion Inc."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Country</label>
                                    <input 
                                        type="text" 
                                        name="country" 
                                        value={formData.country} 
                                        onChange={handleChange} 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                                        placeholder="e.g. India, United States" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Headquarters</label>
                                    <input 
                                        type="text" 
                                        name="headquarters" 
                                        value={formData.headquarters} 
                                        onChange={handleChange} 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                                        placeholder="e.g. New Delhi, Delhi, India" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Other Offices</label>
                                    <input 
                                        type="text" 
                                        name="otherOffices" 
                                        value={formData.otherOffices} 
                                        onChange={handleChange} 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                                        placeholder="e.g. San Francisco, London, Bangalore" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Admin / Contact Email</label>
                                    <input 
                                        type="email" 
                                        name="adminEmail" 
                                        value={formData.adminEmail} 
                                        onChange={handleChange} 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                                        placeholder="contact@company.com" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
                                    <input 
                                        type="text" 
                                        name="adminPhone" 
                                        value={formData.adminPhone} 
                                        onChange={handleChange} 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                                        placeholder="+1 (555) 019-2834" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Website URL</label>
                                    <input 
                                        type="text" 
                                        name="website" 
                                        value={formData.website} 
                                        onChange={handleChange} 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                                        placeholder="https://yourcompany.com" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Industry</label>
                                    <input 
                                        type="text" 
                                        name="industry" 
                                        value={formData.industry} 
                                        onChange={handleChange} 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                                        placeholder="e.g. Enterprise Software, FinTech" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Company Size (Employees)</label>
                                    <select 
                                        name="teamSize" 
                                        value={formData.teamSize} 
                                        onChange={handleChange} 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                                    >
                                        <option value="1-10">1-10 Employees</option>
                                        <option value="11-50">11-50 Employees</option>
                                        <option value="51-200">51-200 Employees</option>
                                        <option value="201-500">201-500 Employees</option>
                                        <option value="500+">500+ Employees</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Founded Date</label>
                                    <input 
                                        type="date" 
                                        name="foundedDate" 
                                        value={formData.foundedDate} 
                                        onChange={handleChange} 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Products Built</label>
                                    <input 
                                        type="text" 
                                        name="productsBuilt" 
                                        value={formData.productsBuilt} 
                                        onChange={handleChange} 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                                        placeholder="e.g. 5, 12, 50+" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Happy Clients</label>
                                    <input 
                                        type="text" 
                                        name="happyClients" 
                                        value={formData.happyClients} 
                                        onChange={handleChange} 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                                        placeholder="e.g. 150, 500+" 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Social Links & Other */}
                        <div>
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                                <Globe className="w-4 h-4 mr-1.5 text-blue-600" />
                                Social Links & Response Info
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Typical Response Time</label>
                                    <input 
                                        type="text" 
                                        name="responseTime" 
                                        value={formData.socialLinks.responseTime || ''} 
                                        onChange={handleSocialChange} 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                                        placeholder="e.g. Within 24 hours, Under 1 hour" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">LinkedIn URL</label>
                                    <input 
                                        type="text" 
                                        name="linkedin" 
                                        value={formData.socialLinks.linkedin || ''} 
                                        onChange={handleSocialChange} 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                                        placeholder="https://linkedin.com/company/..." 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Twitter / X URL</label>
                                    <input 
                                        type="text" 
                                        name="twitter" 
                                        value={formData.socialLinks.twitter || ''} 
                                        onChange={handleSocialChange} 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                                        placeholder="https://x.com/..." 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">YouTube URL</label>
                                    <input 
                                        type="text" 
                                        name="youtube" 
                                        value={formData.socialLinks.youtube || ''} 
                                        onChange={handleSocialChange} 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                                        placeholder="https://youtube.com/@..." 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Instagram URL</label>
                                    <input 
                                        type="text" 
                                        name="instagram" 
                                        value={formData.socialLinks.instagram || ''} 
                                        onChange={handleSocialChange} 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                                        placeholder="https://instagram.com/..." 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Facebook URL</label>
                                    <input 
                                        type="text" 
                                        name="facebook" 
                                        value={formData.socialLinks.facebook || ''} 
                                        onChange={handleSocialChange} 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                                        placeholder="https://facebook.com/..." 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">GitHub URL</label>
                                    <input 
                                        type="text" 
                                        name="github" 
                                        value={formData.socialLinks.github || ''} 
                                        onChange={handleSocialChange} 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                                        placeholder="https://github.com/..." 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">TikTok URL</label>
                                    <input 
                                        type="text" 
                                        name="tiktok" 
                                        value={formData.socialLinks.tiktok || ''} 
                                        onChange={handleSocialChange} 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                                        placeholder="https://tiktok.com/@..." 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Pinterest URL</label>
                                    <input 
                                        type="text" 
                                        name="pinterest" 
                                        value={formData.socialLinks.pinterest || ''} 
                                        onChange={handleSocialChange} 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                                        placeholder="https://pinterest.com/..." 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Discord Invite URL</label>
                                    <input 
                                        type="text" 
                                        name="discord" 
                                        value={formData.socialLinks.discord || ''} 
                                        onChange={handleSocialChange} 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
                                        placeholder="https://discord.gg/..." 
                                    />
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-5 border-t border-gray-100 flex items-center justify-end space-x-3 bg-gray-50/80 sticky bottom-0">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        form="overview-edit-form" 
                        disabled={isLoading} 
                        className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors flex items-center shadow-md shadow-blue-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <LogoLoader className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
