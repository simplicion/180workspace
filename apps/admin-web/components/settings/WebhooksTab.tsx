'use client';

import { useState, useEffect } from 'react';
import { useSettings } from '@/lib/settings-context';
import { Globe, Save, Loader2, Info } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function WebhooksTab() {
    const { settings: globalSettings, refreshSettings: refreshGlobalSettings } = useSettings();
    const [saving, setSaving] = useState(false);
    const [webhookUrl, setWebhookUrl] = useState(globalSettings?.webhookUrl || '');
    const [webhookSecret, setWebhookSecret] = useState(globalSettings?.webhookSecret || '');

    useEffect(() => {
        if (globalSettings) {
            setWebhookUrl(globalSettings.webhookUrl || '');
            setWebhookSecret(globalSettings.webhookSecret || '');
        }
    }, [globalSettings]);

    const saveSettings = async () => {
        setSaving(true);
        try {
            await api.put('/api/settings', {
                webhookUrl, webhookSecret
            });
            toast.success('Webhook settings updated');
            await refreshGlobalSettings();
        } catch (e: any) {
            toast.error(e?.response?.data?.error || 'Failed to update webhooks');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex items-center gap-4 bg-gradient-to-br from-white to-gray-50/30">
                    <div className="p-3 bg-indigo-50 rounded-2xl">
                        <Globe className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-900">Outgoing Webhooks</h2>
                        <p className="text-sm text-gray-500 font-medium tracking-tight">Stream platform events to external services.</p>
                    </div>
                </div>

                <div className="p-8 space-y-6">
                    <p className="text-sm text-gray-500 leading-relaxed font-medium">
                        Configure your n8n, Zapier, or custom webhook endpoint to receive real-time updates for platform events like task creation, milestones, and status changes.
                    </p>

                    <div className="grid gap-6">
                        <div className="space-y-2">
                            <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                Webhook Endpoint URL
                            </label>
                            <input 
                                value={webhookUrl} 
                                onChange={e => setWebhookUrl(e.target.value)} 
                                placeholder="https://n8n.example.com/webhook/ims" 
                                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" 
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                Webhook Secret Key
                            </label>
                            <input 
                                type="password" 
                                value={webhookSecret} 
                                onChange={e => setWebhookSecret(e.target.value)} 
                                placeholder="Optional secret for payload verification" 
                                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" 
                            />
                            <div className="flex items-start gap-2 pt-1">
                                <Info className="w-3.5 h-3.5 text-indigo-500 mt-0.5" />
                                <p className="text-[10px] text-gray-400 font-medium">This secret will be sent in the `x-webhook-secret` header for verification.</p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4">
                        <button 
                            onClick={saveSettings} 
                            disabled={saving} 
                            className="flex items-center justify-center gap-2 w-full py-4 bg-indigo-600 text-white rounded-[20px] text-sm font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {saving ? 'UPDATING...' : 'SAVE WEBHOOK CONFIGURATION'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
