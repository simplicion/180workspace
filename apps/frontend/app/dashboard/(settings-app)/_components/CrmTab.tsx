'use client';

import { useState, useEffect } from 'react';
import { useSettings } from '@/lib/settings-context';
import { Activity, Save, Loader2, TrendingUp, Target, BarChart2 } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function CrmTab() {
    const { settings: globalSettings, refreshSettings: refreshGlobalSettings } = useSettings();
    const [saving, setSaving] = useState(false);
    const [salesConfig, setSalesConfig] = useState<any>(globalSettings?.salesConfig || {
        leadScoring: { companySizeWeight: 0.3, industryWeight: 0.25, engagementWeight: 0.25, sourceWeight: 0.20 },
        opportunityStages: { leadWeight: 0.10, qualifiedWeight: 0.30, demoWeight: 0.50, proposalWeight: 0.70, negotiationWeight: 0.85 },
        repProductivity: { dealsClosedWeight: 0.5, revenueGeneratedWeight: 0.3, activitiesCompletedWeight: 0.2 }
    });

    useEffect(() => {
        if (globalSettings?.salesConfig) {
            setSalesConfig(globalSettings.salesConfig);
        }
    }, [globalSettings]);

    const saveSettings = async () => {
        setSaving(true);
        try {
            await api.put('/api/settings', { salesConfig });
            toast.success('CRM intelligence weights updated');
            await refreshGlobalSettings();
        } catch (e: any) {
            toast.error(e?.response?.data?.error || 'Failed to update CRM config');
        } finally {
            setSaving(false);
        }
    };

    const updateWeight = (category: string, key: string, value: string) => {
        setSalesConfig({
            ...salesConfig,
            [category]: {
                ...salesConfig[category],
                [key]: parseFloat(value) || 0
            }
        });
    };

    return (
        <div className="space-y-8 pb-20">
            <header className="flex items-center justify-between bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 rounded-2xl">
                        <Activity className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-900">Sales CRM Algorithms</h2>
                        <p className="text-sm text-gray-500 font-medium tracking-tight">Configure mathematical weights for statistical models.</p>
                    </div>
                </div>
                <button 
                    onClick={saveSettings} 
                    disabled={saving} 
                    className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? 'Saving...' : 'Save Weights'}
                </button>
            </header>

            {/* Lead Scoring Section */}
            <section className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex items-center gap-3">
                    <Target className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-black text-gray-900">Lead Scoring Strategy</h3>
                </div>
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {Object.keys(salesConfig.leadScoring).map((key) => (
                        <div key={key} className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                            </label>
                            <input 
                                type="number" 
                                step="0.05" 
                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-black text-gray-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                value={salesConfig.leadScoring[key]}
                                onChange={(e) => updateWeight('leadScoring', key, e.target.value)}
                            />
                        </div>
                    ))}
                </div>
            </section>

            {/* Opportunity Sections */}
            <section className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                    <h3 className="font-black text-gray-900">Opportunity Stage probabilities</h3>
                </div>
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {Object.keys(salesConfig.opportunityStages).map((key) => (
                        <div key={key} className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                            </label>
                            <input 
                                type="number" 
                                step="0.05" 
                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-black text-gray-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                value={salesConfig.opportunityStages[key]}
                                onChange={(e) => updateWeight('opportunityStages', key, e.target.value)}
                            />
                        </div>
                    ))}
                </div>
            </section>

            {/* Rep Productivity */}
            <section className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex items-center gap-3">
                    <BarChart2 className="w-5 h-5 text-purple-500" />
                    <h3 className="font-black text-gray-900">Rep Productivity weights</h3>
                </div>
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.keys(salesConfig.repProductivity).map((key) => (
                        <div key={key} className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                            </label>
                            <input 
                                type="number" 
                                step="0.05" 
                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-black text-gray-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                value={salesConfig.repProductivity[key]}
                                onChange={(e) => updateWeight('repProductivity', key, e.target.value)}
                            />
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
