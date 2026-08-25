"use client";

import { LogoLoader } from "@workspace/ui";
import React, { useState } from 'react';
import { X, Save, Plus } from 'lucide-react';

interface CompanyOverviewEditModalProps {
    company: any;
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
}

export function CompanyOverviewEditModal({ company, isOpen, onClose, onSave }: CompanyOverviewEditModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    
    let meta: any = {};
    try { meta = typeof company.metadata === 'string' ? JSON.parse(company.metadata) : (company.metadata || {}); } catch(e) {}
    
    let parsedTags = [];
    try { parsedTags = typeof company.tags === 'string' ? JSON.parse(company.tags) : (company.tags || []); } catch(e) {}
    
    let parsedHighlights = [];
    try { parsedHighlights = meta.companyHighlights || []; } catch(e) {}

    let parsedSocials: any = {};
    try { parsedSocials = typeof company.socialLinks === 'string' ? JSON.parse(company.socialLinks) : (company.socialLinks || {}); } catch(e) {}

    const [formData, setFormData] = useState({
        aboutUs: company.aboutUs || '',
        companyType: company.companyType || '',
        otherOffices: company.otherOffices || '',
        country: company.country || '',
        name: company.name || '',
        adminPhone: company.adminPhone || '',
        adminEmail: company.adminEmail || '',
        socialLinks: parsedSocials,
        tags: parsedTags,
        companyHighlights: parsedHighlights
    });

    const [newTag, setNewTag] = useState('');
    const [newHighlight, setNewHighlight] = useState('');

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSocialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            socialLinks: {
                ...formData.socialLinks,
                [e.target.name]: e.target.value
            }
        });
    };

    const addTag = () => {
        if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
            setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] });
            setNewTag('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        setFormData({ ...formData, tags: formData.tags.filter((t: string) => t !== tagToRemove) });
    };

    const addHighlight = () => {
        if (newHighlight.trim()) {
            setFormData({ ...formData, companyHighlights: [...formData.companyHighlights, newHighlight.trim()] });
            setNewHighlight('');
        }
    };

    const removeHighlight = (index: number) => {
        setFormData({ 
            ...formData, 
            companyHighlights: formData.companyHighlights.filter((_: any, i: number) => i !== index) 
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            // Stringify JSON fields before sending
            const dataToSave = {
                ...formData,
                tags: JSON.stringify(formData.tags),
                socialLinks: JSON.stringify(formData.socialLinks)
            };
            
            await onSave(dataToSave);
            onClose();
        } catch (error) {
            console.error('Failed to save overview data', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-3xl sm:rounded-2xl shadow-xl flex flex-col animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8 sm:zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">Edit Overview Details</h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                    <form id="overview-edit-form" onSubmit={handleSubmit} className="space-y-8">
                        {/* About Us */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-1">About Company</label>
                            <textarea 
                                name="aboutUs" 
                                value={formData.aboutUs} 
                                onChange={handleChange} 
                                rows={4} 
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                        </div>

                        {/* Tags / Specialties */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-1">Services & Specialties (Tags)</label>
                            <div className="flex gap-2 mb-2">
                                <input 
                                    type="text" 
                                    value={newTag} 
                                    onChange={e => setNewTag(e.target.value)}
                                    onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    placeholder="e.g. SaaS, Artificial Intelligence"
                                />
                                <button type="button" onClick={addTag} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">Add</button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {formData.tags.map((tag: string) => (
                                    <span key={tag} className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-full border border-blue-100">
                                        {tag}
                                        <button type="button" onClick={() => removeTag(tag)} className="ml-2 text-blue-500 hover:text-blue-800">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Company Details */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Company Details</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Legal Name</label>
                                    <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                                    <input type="text" name="country" value={formData.country} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" placeholder="e.g. USA, India" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Other Offices</label>
                                    <input type="text" name="otherOffices" value={formData.otherOffices} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" placeholder="e.g. Delhi, San Francisco" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input type="email" name="adminEmail" value={formData.adminEmail || ''} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                    <input type="text" name="adminPhone" value={formData.adminPhone || ''} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
                                </div>
                            </div>
                        </div>



                        {/* Social Links & Other */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Social Links & Info</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Response Time</label>
                                    <input type="text" name="responseTime" value={formData.socialLinks.responseTime || ''} onChange={handleSocialChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. Within 24 hrs" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">LinkedIn</label>
                                    <input type="text" name="linkedin" value={formData.socialLinks.linkedin || ''} onChange={handleSocialChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" placeholder="https://linkedin.com/company/..." />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Twitter / X</label>
                                    <input type="text" name="twitter" value={formData.socialLinks.twitter || ''} onChange={handleSocialChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" placeholder="https://twitter.com/..." />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">YouTube</label>
                                    <input type="text" name="youtube" value={formData.socialLinks.youtube || ''} onChange={handleSocialChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" placeholder="https://youtube.com/..." />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Instagram</label>
                                    <input type="text" name="instagram" value={formData.socialLinks.instagram || ''} onChange={handleSocialChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" placeholder="https://instagram.com/..." />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Facebook</label>
                                    <input type="text" name="facebook" value={formData.socialLinks.facebook || ''} onChange={handleSocialChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" placeholder="https://facebook.com/..." />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">GitHub</label>
                                    <input type="text" name="github" value={formData.socialLinks.github || ''} onChange={handleSocialChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" placeholder="https://github.com/..." />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">TikTok</label>
                                    <input type="text" name="tiktok" value={formData.socialLinks.tiktok || ''} onChange={handleSocialChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" placeholder="https://tiktok.com/..." />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Pinterest</label>
                                    <input type="text" name="pinterest" value={formData.socialLinks.pinterest || ''} onChange={handleSocialChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" placeholder="https://pinterest.com/..." />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Discord</label>
                                    <input type="text" name="discord" value={formData.socialLinks.discord || ''} onChange={handleSocialChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" placeholder="https://discord.gg/..." />
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="p-4 sm:p-6 border-t border-gray-100 flex items-center justify-end space-x-3 bg-gray-50 rounded-b-2xl">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        Cancel
                    </button>
                    <button type="submit" form="overview-edit-form" disabled={isLoading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center disabled:opacity-70 disabled:cursor-not-allowed">
                        {isLoading ? <LogoLoader className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
