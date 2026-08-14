"use client";

import { LogoLoader } from "@workspace/ui";
import { useState, useEffect } from 'react';
import { Plus, Globe, MousePointer2, Users, Search, Filter, Settings } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import CreateWebsiteModal from '@/app/dashboard/(advertising-app)/_components/CreateWebsiteModal';
import WebsiteCard from '@/app/dashboard/(advertising-app)/_components/WebsiteCard';

export default function AdvertisingPage() {
    const [websites, setWebsites] = useState<any[]>([]);
    const [companyData, setCompanyData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    useEffect(() => {
        fetchWebsites();
    }, []);

    const fetchWebsites = async () => {
        try {
            setLoading(true);
            const res = await api.get('/api/websites');
            setWebsites(res.data.websites || []);
            setCompanyData(res.data.company || null);
        } catch (error) {
            console.error('Failed to fetch websites:', error);
            toast.error('Failed to load websites');
        } finally {
            setLoading(false);
        }
    };

    const totalLeads = websites.reduce((acc, w) => acc + (w.stats?.leads || 0), 0);
    const totalVisits = websites.reduce((acc, w) => acc + (w.stats?.views || 0), 0);

    const filteredWebsites = websites.filter(w => 
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <CreateWebsiteModal 
                isOpen={isCreateModalOpen} 
                onClose={() => setIsCreateModalOpen(false)} 
                onSuccess={fetchWebsites}
                websiteCount={websites.length}
                companyData={companyData}
            />
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Ad Websites</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage your marketing landing pages and track performance.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link 
                        href="/dashboard/advertising/settings"
                        className="flex items-center gap-2 bg-white text-gray-700 px-4 py-2.5 rounded-xl font-bold hover:bg-gray-50 border border-gray-200 transition-all shadow-sm"
                    >
                        <Settings className="w-4 h-4" />
                        Settings
                    </Link>
                    <button 
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
                        onClick={() => setIsCreateModalOpen(true)}
                    >
                        <Plus className="w-4 h-4" />
                        Create Website
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                        <Globe className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Active Sites</p>
                        <p className="text-2xl font-bold text-gray-900">{websites.filter(w => w.status === 'active').length}</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                        <Users className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Leads</p>
                        <p className="text-2xl font-bold text-gray-900">{totalLeads}</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                        <MousePointer2 className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Visits</p>
                        <p className="text-2xl font-bold text-gray-900">{totalVisits}</p>
                    </div>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search websites..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    />
                </div>
                <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">
                    <Filter className="w-4 h-4" />
                    Filters
                </button>
            </div>

            {/* Websites Grid */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <LogoLoader className="w-8 h-8 animate-spin text-indigo-600" />
                    <p className="text-gray-500 text-sm mt-4">Loading your websites...</p>
                </div>
            ) : filteredWebsites.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredWebsites.map((website) => (
                        <WebsiteCard key={website.id} website={website} companyData={companyData} onRefresh={fetchWebsites} />
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-12 text-center">
                    <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-6">
                        <Globe className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">No websites found</h3>
                    <p className="text-gray-500 text-sm max-w-sm mx-auto mb-8">
                        Create your first marketing website to start capturing leads for your campaigns.
                    </p>
                    <button 
                        className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                        onClick={() => setIsCreateModalOpen(true)}
                    >
                        <Plus className="w-5 h-5" />
                        Create My First Website
                    </button>
                </div>
            )}
        </div>
    );
}
