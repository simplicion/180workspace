'use client';

import { LogoLoader } from "@workspace/ui";
import { useEffect, useState } from 'react';
import { Save, Zap, CheckCircle, XCircle, Globe, ShieldCheck, ToggleRight } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import saApi from '../../../lib/superadmin-api';

export default function PaymentsPage() {
    const [cfg, setCfg] = useState<any>({});
    const [form, setForm] = useState<any>({
        paymentsEnabled: false,
        currency: 'INR',
        platformApiUrl: '',
        paymentConfig: {
            activeProvider: 'razorpay',
            razorpay: { keyId: '', secret: '', webhookSecret: '' },
            stripe: { keyId: '', secret: '', webhookSecret: '' }
        }
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ connected?: boolean; message?: string } | null>(null);

    useEffect(() => {
        saApi.get('/payments/config').then(({ data }) => {
            setCfg(data.config);
            setForm({
                paymentsEnabled: data.config.paymentsEnabled,
                currency: data.config.currency || 'INR',
                platformApiUrl: data.config.platformApiUrl || '',
                paymentConfig: {
                    activeProvider: data.config.paymentConfig?.activeProvider || 'razorpay',
                    razorpay: {
                        keyId: '', secret: '', webhookSecret: ''
                    },
                    stripe: {
                        keyId: '', secret: '', webhookSecret: ''
                    }
                }
            });
        }).finally(() => setLoading(false));
    }, []);

    const updateProviderField = (provider: string, field: string, value: string) => {
        setForm((prev: any) => ({
            ...prev,
            paymentConfig: {
                ...prev.paymentConfig,
                [provider]: {
                    ...prev.paymentConfig[provider],
                    [field]: value
                }
            }
        }));
    };

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            // Only send populated fields to avoid overriding configured masks
            const payload: any = {
                paymentsEnabled: form.paymentsEnabled,
                currency: form.currency,
                platformApiUrl: form.platformApiUrl,
                paymentConfig: {
                    activeProvider: form.paymentConfig.activeProvider
                }
            };

            ['razorpay', 'stripe'].forEach((p) => {
                if (form.paymentConfig[p].keyId || form.paymentConfig[p].secret || form.paymentConfig[p].webhookSecret) {
                    payload.paymentConfig[p] = {};
                    if (form.paymentConfig[p].keyId) payload.paymentConfig[p].keyId = form.paymentConfig[p].keyId;
                    if (form.paymentConfig[p].secret) payload.paymentConfig[p].secret = form.paymentConfig[p].secret;
                    if (form.paymentConfig[p].webhookSecret) payload.paymentConfig[p].webhookSecret = form.paymentConfig[p].webhookSecret;
                }
            });

            await saApi.put('/payments/config', payload);
            toast.success('Payment config updated');
        } catch { toast.error('Failed to update config'); }
        setSaving(false);
    };

    const test = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const { data } = await saApi.post('/payments/test');
            setTestResult(data);
        } catch { setTestResult({ connected: false, message: 'Connection test failed' }); }
        setTesting(false);
    };

    if (loading) return <div className="h-96 bg-slate-50 border border-slate-200 rounded-3xl animate-pulse flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Security Protocol...</div>;

    const actProvider = form.paymentConfig.activeProvider;

    return (
        <div className="space-y-5 max-w-2xl">
            <Toaster position="top-center" />
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200"><Globe className="w-6 h-6" /></div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Payment Abstraction</h1>
                        <p className="text-slate-500 text-sm font-medium">Configure and route global payment gateaways</p>
                    </div>
                </div>
            </div>

            <form onSubmit={save} className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-10 space-y-8 shadow-xl shadow-slate-100/50 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-sky-500 opacity-20" />

                <div className="flex items-center justify-between py-4 bg-slate-50/50 px-6 rounded-2xl border border-slate-100 mb-4">
                    <div>
                        <p className="text-sm font-bold text-slate-900">Live Payments Switch</p>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">Control global transaction capabilities</p>
                    </div>
                    <button type="button" onClick={() => setForm((p: any) => ({ ...p, paymentsEnabled: !p.paymentsEnabled }))}
                        aria-label="Toggle Live Payments"
                        className={`w-14 h-7 rounded-full transition-all relative flex items-center px-1 duration-300 ${form.paymentsEnabled ? 'bg-indigo-500 shadow-inner' : 'bg-slate-300'}`}>
                        <div className={`w-5 h-5 bg-white rounded-full transition-transform shadow-md ${form.paymentsEnabled ? 'translate-x-7' : 'translate-x-0'}`} />
                    </button>
                </div>

                <div className="space-y-4">
                    <label className="block text-[10px] text-slate-500 font-black uppercase tracking-[0.15em] ml-1">Active Payment Gateway</label>
                    <div className="grid grid-cols-2 gap-4">
                        {['razorpay', 'stripe'].map((prv) => (
                            <div key={prv} onClick={() => setForm((p: any) => ({ ...p, paymentConfig: { ...p.paymentConfig, activeProvider: prv } }))}
                                className={`p-4 border-2 rounded-2xl cursor-pointer transition-all flex items-center gap-3 ${actProvider === prv ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-sm' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'}`}>
                                <ToggleRight className={`w-5 h-5 ${actProvider === prv ? 'text-indigo-600' : 'text-slate-300'}`} />
                                <span className="font-bold text-sm uppercase tracking-wide">{prv}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Credentials Configurations for {actProvider}</h3>

                    {[
                        { label: 'Public Key ID / Publishable Key', key: 'keyId', placeholder: cfg?.paymentConfig?.[actProvider]?.keyId || 'Live Key...' },
                        { label: 'Secret Key', key: 'secret', placeholder: cfg?.paymentConfig?.[actProvider]?.secret || '••••••••••••••••' },
                        { label: 'Webhook Secret', key: 'webhookSecret', placeholder: cfg?.paymentConfig?.[actProvider]?.webhookSecret || '••••••••••••••••' },
                    ].map(f => (
                        <div key={f.key}>
                            <label className="block text-[10px] text-slate-500 mb-2 font-black uppercase tracking-[0.15em] ml-1">{f.label}</label>
                            <input type="password" value={form.paymentConfig[actProvider]?.[f.key] || ''} onChange={e => updateProviderField(actProvider, f.key, e.target.value)}
                                placeholder={f.placeholder}
                                className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium shadow-sm" />
                        </div>
                    ))}
                </div>

                <div className="pt-2">
                    <label className="block text-[10px] text-slate-500 mb-2 font-black uppercase tracking-[0.15em] ml-1">Platform API URL (Live)</label>
                    <input type="text" value={form.platformApiUrl} onChange={e => setForm((p: any) => ({ ...p, platformApiUrl: e.target.value }))}
                        placeholder="https://api.yourdomain.com"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium shadow-sm mb-6" />

                    <label className="block text-[10px] text-slate-500 mb-2 font-black uppercase tracking-[0.15em] ml-1">Platform Currency</label>
                    <select value={form.currency} onChange={e => setForm((p: any) => ({ ...p, currency: e.target.value }))}
                        aria-label="Platform Currency"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-sm shadow-sm appearance-none">
                        {['INR', 'USD', 'EUR', 'GBP'].map(c => <option key={c}>{c}</option>)}
                    </select>
                </div>

                {testResult && (
                    <div className={`flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-bold shadow-sm animate-in slide-in-from-top-2 duration-300 ${testResult.connected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                        {testResult.connected ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <XCircle className="w-5 h-5 flex-shrink-0" />}
                        {testResult.message}
                    </div>
                )}

                <div className="flex gap-4 pt-6">
                    <button type="button" onClick={test} disabled={testing}
                        className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-sm flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50">
                        {testing ? <LogoLoader className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 text-indigo-500" />}
                        Test API Gateway
                    </button>
                    <button type="submit" disabled={saving}
                        className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-200 active:scale-95 disabled:opacity-50">
                        {saving ? <LogoLoader className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Commit Configuration
                    </button>
                </div>
            </form>

            <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-8 space-y-4">
                <div className="flex items-center gap-3 text-indigo-800">
                    <Globe className="w-5 h-5" />
                    <h2 className="font-bold text-sm uppercase tracking-wider">Universal Webhook Endpoint</h2>
                </div>
                <p className="text-sm text-indigo-700 leading-relaxed font-medium">
                    Automate subscriptions securely by copying the active gateway endpoint below into your provider&apos;s dashboard webhook settings.
                </p>
                <div className="bg-white border border-indigo-200 rounded-2xl p-4 flex items-center justify-between group overflow-hidden">
                    <code className="text-xs font-mono text-slate-600 select-all truncate mr-4">
                        {`${(form.platformApiUrl || (typeof window !== 'undefined' ? window.location.origin.replace(':3000', ':5000') : 'https://api.yourdomain.com')).replace(/\/$/, '')}/api/webhooks/${actProvider}`}
                    </code>
                    <div className="flex-shrink-0 px-3 py-2 bg-indigo-100 text-indigo-600 text-[10px] font-black rounded-xl uppercase tracking-tight group-hover:bg-indigo-600 group-hover:text-white transition-colors cursor-pointer"
                        onClick={() => {
                            const base = form.platformApiUrl || (typeof window !== 'undefined' ? window.location.origin.replace(':3000', ':5000') : '');
                            const url = `${base.replace(/\/$/, '')}/api/webhooks/${actProvider}`;
                            navigator.clipboard.writeText(url);
                            toast.success('Webhook URL Copied');
                        }}>
                        Copy Hook
                    </div>
                </div>
                <div className="flex items-start gap-3 bg-white/50 p-4 rounded-xl border border-indigo-100 mt-4">
                    <ShieldCheck className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                    <p className="text-[11px] text-indigo-600 font-medium leading-normal">
                        <strong>Security Enforcement Check:</strong> Missing Webhook Secrets will result in automated network payload rejections inherently preventing system mutation tampering from unauthorized actors via {actProvider}.
                    </p>
                </div>
            </div>
        </div>
    );
}

