"use client";

import { useState, useEffect } from 'react';
import { ArrowLeft, Globe, CheckCircle2, Shield, Info, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function AdvertisingSettingsPage() {
    const [domain, setDomain] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savedDomain, setSavedDomain] = useState('');

    useEffect(() => {
        fetchCompanyDomain();
    }, []);

    const fetchCompanyDomain = async () => {
        try {
            const res = await api.get('/api/websites');
            if (res.data.company?.customDomain) {
                setDomain(res.data.company.customDomain);
                setSavedDomain(res.data.company.customDomain);
            }
        } catch (error) {
            toast.error('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await api.patch('/api/company/profile', { customDomain: domain });
            toast.success('Custom domain saved successfully!');
            setSavedDomain(domain);
        } catch (error) {
            toast.error('Failed to save domain');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return null;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link 
                    href="/dashboard/advertising"
                    className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Advertising Settings</h1>
                    <p className="text-sm text-gray-500">Configure global settings for your marketing websites.</p>
                </div>
            </div>

            {/* Custom Domain Configuration */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-gray-100">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                            <Globe className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Custom Domain Connection</h2>
                            <p className="text-sm text-gray-500">Serve your advertising landing pages from your own domain.</p>
                        </div>
                    </div>

                    <div className="max-w-xl space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">
                                Enter your root domain
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">https://</span>
                                <input 
                                    type="text" 
                                    className="w-full pl-20 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                                    placeholder="example.com"
                                    value={domain}
                                    onChange={(e) => setDomain(e.target.value.toLowerCase().replace(/^https?:\/\//, ''))}
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-2 ml-1">
                                Your primary website will be served at exactly this domain.
                            </p>
                        </div>

                        <button 
                            onClick={handleSave}
                            disabled={saving || domain === savedDomain}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-100"
                        >
                            {saving ? 'Saving...' : savedDomain && domain === savedDomain ? 'Saved' : 'Save Domain'}
                        </button>
                    </div>
                </div>

                <div className="bg-gray-50 p-8 space-y-6">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">DNS Configuration Guide</h3>
                    
                    <div className="space-y-4">
                        <div className="bg-white p-5 rounded-2xl border border-gray-200">
                            <div className="flex items-start gap-4">
                                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="text-blue-600 font-bold text-sm">1</span>
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900 mb-1">Primary Website (Root Domain)</p>
                                    <p className="text-sm text-gray-600 mb-4">To serve your primary website at the root domain, add an A Record pointing to our servers.</p>
                                    
                                    <div className="bg-gray-900 rounded-xl overflow-hidden font-mono text-sm">
                                        <table className="w-full text-left text-gray-300">
                                            <thead className="bg-gray-800/50">
                                                <tr>
                                                    <th className="px-4 py-2 font-medium">Type</th>
                                                    <th className="px-4 py-2 font-medium">Name</th>
                                                    <th className="px-4 py-2 font-medium">Value</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td className="px-4 py-3 border-t border-gray-800">A</td>
                                                    <td className="px-4 py-3 border-t border-gray-800">@</td>
                                                    <td className="px-4 py-3 border-t border-gray-800 text-emerald-400">76.76.21.21</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-gray-200">
                            <div className="flex items-start gap-4">
                                <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="text-purple-600 font-bold text-sm">2</span>
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900 mb-1">Secondary Websites (Wildcard Subdomains)</p>
                                    <p className="text-sm text-gray-600 mb-4">To automatically route secondary marketing websites to subdomains (e.g., `campaign1.yourdomain.com`), add a wildcard CNAME record.</p>
                                    
                                    <div className="bg-gray-900 rounded-xl overflow-hidden font-mono text-sm">
                                        <table className="w-full text-left text-gray-300">
                                            <thead className="bg-gray-800/50">
                                                <tr>
                                                    <th className="px-4 py-2 font-medium">Type</th>
                                                    <th className="px-4 py-2 font-medium">Name</th>
                                                    <th className="px-4 py-2 font-medium">Value</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td className="px-4 py-3 border-t border-gray-800">CNAME</td>
                                                    <td className="px-4 py-3 border-t border-gray-800">*</td>
                                                    <td className="px-4 py-3 border-t border-gray-800 text-emerald-400">cname.{process.env.NEXT_PUBLIC_ROOT_DOMAIN || process.env.NEXT_PUBLIC_MAIN_DOMAIN || ''}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-blue-50/50 text-blue-800 rounded-xl text-sm">
                        <Info className="w-5 h-5 shrink-0 mt-0.5" />
                        <p>DNS changes can take up to 24-48 hours to propagate globally, though typically they reflect within a few minutes. SSL certificates will be generated automatically once DNS is verified.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
