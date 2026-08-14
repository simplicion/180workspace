'use client';

import { LogoLoader } from "@workspace/ui";
import { useState, useEffect, Suspense } from 'react';
import nextDynamic from 'next/dynamic';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Globe, MousePointer2, Users, Plus, Trash2, ArrowLeft, ExternalLink, Code, Activity, Clock, Sparkles, Edit3 } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

// Dynamically import charts to improve build performance
const WebsiteCharts = nextDynamic(() => import('./WebsiteCharts'), { 
    ssr: false,
    loading: () => <div className="h-[350px] w-full bg-gray-50 animate-pulse rounded-[2.5rem]" />
});


export default function WebsiteDashboardPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center py-20"><LogoLoader className="w-8 h-8 animate-spin text-indigo-600" /></div>}>
            <WebsiteDashboardInner />
        </Suspense>
    );
}

function WebsiteDashboardInner() {
    const { id } = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [website, setWebsite] = useState<any>(null);
    const [leads, setLeads] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');

    useEffect(() => {
        fetchWebsiteData();
    }, [id]);

    const fetchWebsiteData = async () => {
        try {
            setLoading(true);
            const [webRes, leadsRes, statsRes] = await Promise.all([
                api.get(`/api/websites/${id}`),
                api.get(`/api/websites/${id}/leads`),
                api.get(`/api/websites/${id}/stats`)
            ]);
            
            // Pixels are now part of the website object in the backend, but we also have a dedicated endpoint
            const pixelsRes = await api.get(`/api/websites/${id}/pixels`);
            
            setWebsite({ 
                ...webRes.data.website, 
                pixels: pixelsRes.data.pixels || [] 
            });
            setLeads(leadsRes.data.leads || []);
            setStats(statsRes.data);
        } catch (error) {
            console.error('Failed to fetch data:', error);
            toast.error('Failed to load website data');
            router.push('/dashboard/advertising');
        } finally {
            setLoading(false);
        }
    };

    if (loading || !website) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <LogoLoader className="w-8 h-8 animate-spin text-indigo-600" />
                <p className="text-gray-500 text-sm mt-4">Loading dashboard...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => router.push('/dashboard/advertising')}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{website.name}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={clsx(
                                "w-2 h-2 rounded-full",
                                website.status === 'active' ? "bg-emerald-500" : "bg-gray-300"
                            )} />
                            <p className="text-sm text-gray-500 font-medium">
                                {website.company?.customDomain 
                                    ? `${website.company.customDomain}${website.isPrimary ? '' : `/${website.slug}`}`
                                    : `${website.company?.slug || 'company'}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || (process.env.NODE_ENV !== 'production' ? 'localhost:3002' : '')}${website.isPrimary ? '' : `/${website.slug}`}`}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push(`/dashboard/advertising/${website.id}/edit`)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-sm font-bold text-indigo-600 hover:bg-indigo-100 transition-all"
                    >
                        <Edit3 className="w-4 h-4" />
                        Edit Website
                    </button>
                    <a 
                        href={(() => {
                            const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || (process.env.NODE_ENV !== 'production' ? 'localhost:3002' : '');
                            const isLocal = rootDomain.includes('localhost');
                            if (website.company?.customDomain) {
                                return website.isPrimary 
                                    ? `https://${website.company.customDomain}`
                                    : `https://${website.slug}.${website.company.customDomain}`;
                            }
                            return `http${isLocal ? '' : 's'}://${website.company?.slug || 'company'}.${rootDomain}${website.isPrimary ? '' : `/${website.slug}`}`;
                        })()}
                        target="_blank"
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all"
                    >
                        <ExternalLink className="w-4 h-4" />
                        Preview Site
                    </a>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-gray-100/50 p-1 rounded-2xl w-fit">
                {['overview', 'leads', 'tools', 'tracking', 'settings'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => {
                            setActiveTab(tab);
                            // Update URL search param without full reload
                            const url = new URL(window.location.href);
                            url.searchParams.set('tab', tab);
                            window.history.pushState({}, '', url.toString());
                        }}
                        className={clsx(
                            "px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                            activeTab === tab 
                                ? "bg-white text-indigo-600 shadow-sm" 
                                : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeTab === 'overview' && <OverviewTab website={website} leads={leads} stats={stats} />}
                    {activeTab === 'leads' && <LeadsTab leads={leads} />}
                    {activeTab === 'tracking' && <TrackingTab website={website} onUpdate={fetchWebsiteData} />}
                    {activeTab === 'tools' && <ToolsTab website={website} />}
                    {activeTab === 'settings' && <SettingsTab website={website} onUpdate={fetchWebsiteData} />}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

// --- Tab Components ---

function OverviewTab({ website, leads, stats }: { website: any, leads: any[], stats: any }) {
    const chartData = stats?.leadsOverTime?.map((d: any) => ({
        name: (d.id || d._id || d.date || '').split('-').slice(1).join('/') || 'Unknown',
        leads: d.count
    })) || [
        { name: 'Mon', leads: 0 },
        { name: 'Tue', leads: 0 },
        { name: 'Wed', leads: 0 },
        { name: 'Thu', leads: 0 },
        { name: 'Fri', leads: 0 },
        { name: 'Sat', leads: 0 },
        { name: 'Sun', leads: 0 },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard icon={Globe} label="Total Views" value={stats?.views || 0} color="indigo" />
                <StatCard icon={Users} label="Total Leads" value={leads.length} color="emerald" />
                <StatCard icon={MousePointer2} label="Conv. Rate" value={`${website.stats?.views > 0 ? ((leads.length / website.stats.views) * 100).toFixed(1) : 0}%`} color="amber" />
                <StatCard icon={Clock} label="Avg. Time" value="2m 45s" color="gray" />
            </div>

            {/* Main Chart */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-xl font-black text-gray-900">Lead Generation</h3>
                        <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-bold">Performance Over Time</p>
                    </div>
                </div>
                <WebsiteCharts chartData={chartData} />
            </div>
        </div>
    );
}

function CustomizeTab({ website, onUpdate }: { website: any, onUpdate: () => void }) {
    const [config, setConfig] = useState(website.config || {
        colors: { primary: '#4f46e5', secondary: '#ffffff', accent: '#10b981' },
        hero: { title: '', subtitle: '', buttonText: 'Get Started' },
        contact: { email: '', phone: '' }
    });
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        try {
            setLoading(true);
            await api.patch(`/api/websites/${website.id}`, { config });
            toast.success('Website customization saved');
            onUpdate();
        } catch (error) {
            toast.error('Failed to save changes');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-8">
                <section className="space-y-4">
                    <h3 className="text-xl font-black text-gray-900">Hero Content</h3>
                    <div className="space-y-4 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Hero Title</label>
                            <input 
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white outline-none"
                                placeholder="e.g., Transform Your Business"
                                value={config.hero?.title || ''}
                                onChange={e => setConfig({...config, hero: {...config.hero, title: e.target.value}})}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Hero Subtitle</label>
                            <textarea 
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white outline-none h-24 resize-none"
                                placeholder="Describe your offer in detail..."
                                value={config.hero?.subtitle || ''}
                                onChange={e => setConfig({...config, hero: {...config.hero, subtitle: e.target.value}})}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Button Text</label>
                            <input 
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white outline-none"
                                value={config.hero?.buttonText || 'Get Started'}
                                onChange={e => setConfig({...config, hero: {...config.hero, buttonText: e.target.value}})}
                            />
                        </div>
                    </div>
                </section>

                <section className="space-y-4">
                    <h3 className="text-xl font-black text-gray-900">Branding & Colors</h3>
                    <div className="grid grid-cols-1 gap-4">
                        <ColorPicker 
                            label="Primary Color" 
                            value={config.colors?.primary || '#4f46e5'} 
                            onChange={val => setConfig({...config, colors: {...config.colors, primary: val}})} 
                        />
                        <ColorPicker 
                            label="Accent Color" 
                            value={config.colors?.accent || '#10b981'} 
                            onChange={val => setConfig({...config, colors: {...config.colors, accent: val}})} 
                        />
                    </div>
                </section>

                <div className="pt-4">
                    <button 
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {loading && <LogoLoader className="w-4 h-4 animate-spin" />}
                        Save Customizations
                    </button>
                </div>
            </div>

            <div className="hidden lg:block sticky top-8">
                <h3 className="text-xl font-black text-gray-900 mb-4">Mobile Preview</h3>
                <div className="bg-gray-100 p-8 rounded-[2.5rem] border border-gray-200 aspect-[9/16] overflow-hidden">
                    <div className="bg-white h-full rounded-2xl shadow-xl overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-gray-50 flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg" style={{ backgroundColor: config.colors?.primary }} />
                            <div className="h-2 w-20 bg-gray-100 rounded" />
                        </div>
                        <div className="p-6 flex-1 flex flex-col justify-center text-center">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-full text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-4 mx-auto">
                                <Sparkles className="w-2 h-2" />
                                Exclusive Offer
                            </div>
                            <h4 className="text-lg font-black text-gray-900 mb-2 leading-tight">
                                {config.hero?.title || 'Your Hero Title Here'}
                            </h4>
                            <p className="text-[10px] text-gray-500 mb-6">
                                {config.hero?.subtitle || 'Your subtitle describing the offer goes here.'}
                            </p>
                            <div className="w-full py-2 rounded-lg text-white text-[10px] font-black uppercase tracking-widest" style={{ backgroundColor: config.colors?.primary }}>
                                {config.hero?.buttonText || 'Get Started'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function LeadsTab({ leads }: { leads: any[] }) {
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
                <h3 className="text-xl font-black text-gray-900">Captured Leads</h3>
                <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold uppercase tracking-wider">
                    {leads.length} Total
                </span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 bg-gray-50/30">
                            <th className="px-8 py-4">Contact Info</th>
                            <th className="px-8 py-4">Campaign Info</th>
                            <th className="px-8 py-4">Status</th>
                            <th className="px-8 py-4">Date</th>
                            <th className="px-8 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {leads.map((lead: any) => (
                            <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-8 py-5">
                                    <p className="font-bold text-gray-900">{lead.name}</p>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                        <button onClick={() => copyToClipboard(lead.email)} className="hover:text-indigo-600 transition-colors underline decoration-indigo-200">{lead.email}</button>
                                        <span className="w-1 h-1 rounded-full bg-gray-200" />
                                        <span>{lead.phone}</span>
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    {lead.utm_source ? (
                                        <div className="flex flex-wrap gap-1">
                                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase">{lead.utm_source}</span>
                                            <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded text-[10px] font-bold uppercase">{lead.utm_medium}</span>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-300 italic font-medium">Direct Traffic</span>
                                    )}
                                </td>
                                <td className="px-8 py-5">
                                    <span className={clsx(
                                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                        lead.status === 'new' ? "bg-blue-50 text-blue-600" :
                                        lead.status === 'contacted' ? "bg-amber-50 text-amber-600" :
                                        "bg-emerald-50 text-emerald-600"
                                    )}>
                                        {lead.status || 'New'}
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-xs text-gray-500 font-medium">
                                    {new Date(lead.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                                        <ExternalLink className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {leads.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-8 py-20 text-center text-gray-400 font-medium">
                                    No leads captured yet. Start driving traffic to your landing page!
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function TrackingTab({ website, onUpdate }: { website: any, onUpdate: () => void }) {
    const [pixels, setPixels] = useState(website.pixels || []);
    const [loading, setLoading] = useState(false);

    const handleAddPixel = () => {
        setPixels([...pixels, { type: 'facebook', pixelId: '', status: 'active' }]);
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            await api.patch(`/api/websites/${website.id}`, { pixels });
            toast.success('Tracking pixels updated');
            onUpdate();
        } catch (error) {
            toast.error('Failed to update tracking');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h3 className="text-xl font-black text-gray-900 mb-2">Tracking & Analytics</h3>
                <p className="text-sm text-gray-500">Add tracking pixels to measure campaign success.</p>
            </div>

            <div className="space-y-4">
                {pixels.map((pixel: any, index: number) => (
                    <div key={index} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-end gap-6">
                        <div className="flex-1 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Platform</label>
                                    <select 
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white transition-all font-medium"
                                        value={pixel.type}
                                        onChange={(e) => {
                                            const newPixels = [...pixels];
                                            newPixels[index].type = e.target.value;
                                            setPixels(newPixels);
                                        }}
                                    >
                                        <option value="facebook">Facebook Pixel</option>
                                        <option value="google">Google Analytics</option>
                                        <option value="tiktok">TikTok Pixel</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Pixel ID / Property ID</label>
                                    <input 
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white transition-all font-medium"
                                        placeholder="Enter ID..."
                                        value={pixel.pixelId}
                                        onChange={(e) => {
                                            const newPixels = [...pixels];
                                            newPixels[index].pixelId = e.target.value;
                                            setPixels(newPixels);
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={() => setPixels(pixels.filter((_: any, i: number) => i !== index))}
                            className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                ))}

                {pixels.length === 0 && (
                    <div className="py-12 border-2 border-dashed border-gray-100 rounded-[2.5rem] flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mb-4">
                            <Activity className="w-8 h-8" />
                        </div>
                        <p className="text-gray-500 font-medium">No tracking pixels added yet.</p>
                        <p className="text-xs text-gray-400 mt-1">Measuring your traffic is essential for growth.</p>
                    </div>
                )}

                <button 
                    onClick={handleAddPixel}
                    className="w-full py-4 border-2 border-dashed border-indigo-100 text-indigo-600 rounded-[2rem] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-50 transition-all"
                >
                    <Plus className="w-5 h-5" />
                    Add Tracking Pixel
                </button>
            </div>

            <div className="flex justify-end pt-4">
                <button 
                    onClick={handleSave}
                    disabled={loading}
                    className="px-12 py-4 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-3 disabled:opacity-50"
                >
                    {loading && <LogoLoader className="w-4 h-4 animate-spin" />}
                    Save Tracking Settings
                </button>
            </div>
        </div>
    );
}

function ToolsTab({ website }: { website: any }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl">
            <div className="space-y-6">
                <h3 className="text-xl font-black text-gray-900">Campaign Management</h3>
                <UTMBuilder website={website} />
            </div>
            <div className="space-y-6">
                <h3 className="text-xl font-black text-gray-900">Data & Exports</h3>
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <Code className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-900">Developer API</p>
                            <p className="text-xs text-gray-500">Access your leads via REST API</p>
                        </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 font-mono text-[10px] text-gray-500 break-all">
                        GET /api/external/leads?site_id={website.id}
                    </div>
                    <button className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 transition-all">
                        Generate API Key
                    </button>
                </div>
            </div>
        </div>
    );
}

function SettingsTab({ website, onUpdate }: { website: any, onUpdate: () => void }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleStatusToggle = async () => {
        try {
            setLoading(true);
            await api.patch(`/api/websites/${website.id}`, { status: website.status === 'active' ? 'inactive' : 'active' });
            toast.success('Website status updated');
            onUpdate();
        } catch (error) {
            toast.error('Failed to update status');
        } finally {
            setLoading(false);
        }
    };

    const handleSetPrimary = async () => {
        if (website.isPrimary) return;
        try {
            setLoading(true);
            await api.put(`/api/websites/${website.id}/primary`);
            toast.success('Website set as primary');
            onUpdate();
        } catch (error) {
            toast.error('Failed to set primary website');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this website? All data and leads will be permanently removed.')) return;
        try {
            setLoading(true);
            await api.delete(`/api/websites/${website.id}`);
            toast.success('Website deleted successfully');
            router.push('/dashboard/advertising');
        } catch (error) {
            toast.error('Failed to delete website');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-3xl">
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                <h3 className="text-xl font-black text-gray-900">Website Control</h3>
                <div className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl border border-gray-100">
                    <div>
                        <p className="font-bold text-gray-900">Website Status</p>
                        <p className="text-xs text-gray-500 mt-1">Control if your landing page is visible to the public.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className={clsx(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                            website.status === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"
                        )}>
                            {website.status}
                        </span>
                        <button 
                            onClick={handleStatusToggle}
                            disabled={loading}
                            className={clsx(
                                "w-12 h-6 rounded-full relative transition-all",
                                website.status === 'active' ? "bg-indigo-600" : "bg-gray-300"
                            )}
                        >
                            <div className={clsx(
                                "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                                website.status === 'active' ? "left-7" : "left-1"
                            )} />
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl border border-gray-100">
                    <div>
                        <p className="font-bold text-gray-900">Primary Website</p>
                        <p className="text-xs text-gray-500 mt-1">Set this website to load when visiting your company&apos;s root domain.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className={clsx(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                            website.isPrimary ? "bg-indigo-50 text-indigo-600" : "bg-gray-100 text-gray-400"
                        )}>
                            {website.isPrimary ? 'PRIMARY' : 'STANDARD'}
                        </span>
                        <button 
                            onClick={handleSetPrimary}
                            disabled={loading || website.isPrimary}
                            className={clsx(
                                "w-12 h-6 rounded-full relative transition-all",
                                website.isPrimary ? "bg-indigo-600 cursor-default" : "bg-gray-300"
                            )}
                        >
                            <div className={clsx(
                                "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                                website.isPrimary ? "left-7" : "left-1"
                            )} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-red-50 shadow-sm space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
                        <Trash2 className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900">Danger Zone</h3>
                </div>
                <p className="text-sm text-gray-500">Once you delete a website, there is no going back. Please be certain.</p>
                <button 
                    onClick={handleDelete}
                    disabled={loading}
                    className="px-8 py-4 bg-red-50 text-red-600 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-red-100 transition-all border border-red-100"
                >
                    Delete Permanently
                </button>
            </div>
        </div>
    );
}

// --- Helper Components ---

function StatCard({ icon: Icon, label, value, color }: { icon: any, label: string, value: any, color: string }) {
    const colors: any = {
        indigo: "bg-indigo-50 text-indigo-600",
        emerald: "bg-emerald-50 text-emerald-600",
        amber: "bg-amber-50 text-amber-600",
        gray: "bg-gray-50 text-gray-400"
    };

    return (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={clsx("w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm", colors[color] || colors.indigo)}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
                <p className="text-2xl font-black text-gray-900 leading-none mt-1">{value}</p>
            </div>
        </div>
    );
}

function ColorPicker({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) {
    return (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <span className="text-sm font-bold text-gray-700">{label}</span>
            <div className="flex items-center gap-3">
                <input 
                    type="text" 
                    value={value} 
                    onChange={(e) => onChange(e.target.value)}
                    className="w-20 px-2 py-1 bg-white border border-gray-200 rounded-lg text-[10px] font-mono text-center outline-none uppercase"
                />
                <input 
                    type="color" 
                    value={value} 
                    onChange={(e) => onChange(e.target.value)}
                    className="w-10 h-10 rounded-xl border-none cursor-pointer bg-transparent"
                />
            </div>
        </div>
    );
}

function UTMBuilder({ website }: any) {
    const [params, setParams] = useState({ source: '', medium: '', campaign: '' });
    
    const buildUrl = () => {
        // Safe check for window
        if (typeof window === 'undefined') return '';
        const url = new URL(`${window.location.origin}/p/${website.slug}`);
        if (params.source) url.searchParams.set('utm_source', params.source);
        if (params.medium) url.searchParams.set('utm_medium', params.medium);
        if (params.campaign) url.searchParams.set('utm_campaign', params.campaign);
        return url.toString();
    };

    const copyUrl = () => {
        navigator.clipboard.writeText(buildUrl());
        toast.success('Campaign URL copied!');
    };

    return (
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <MousePointer2 className="w-6 h-6" />
                </div>
                <div>
                    <p className="font-bold text-gray-900">UTM Campaign Builder</p>
                    <p className="text-xs text-gray-500">Tag your URLs to track lead sources accurately</p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Traffic Source</label>
                        <input 
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white outline-none"
                            placeholder="facebook, google, newsletter"
                            value={params.source}
                            onChange={e => setParams({ ...params, source: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Traffic Medium</label>
                        <input 
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white outline-none"
                            placeholder="cpc, organic, email"
                            value={params.medium}
                            onChange={e => setParams({ ...params, medium: e.target.value })}
                        />
                    </div>
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Campaign Name</label>
                    <input 
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white outline-none"
                        placeholder="summer_sale_2024"
                        value={params.campaign}
                        onChange={e => setParams({ ...params, campaign: e.target.value })}
                    />
                </div>
            </div>

            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Generated URL</p>
                <p className="text-xs font-mono text-indigo-900 break-all leading-relaxed">{buildUrl()}</p>
            </div>

            <button 
                onClick={copyUrl}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
                Copy Campaign Link
            </button>
        </div>
    );
}

