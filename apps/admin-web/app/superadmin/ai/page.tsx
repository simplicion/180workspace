'use client';

import { useEffect, useState } from 'react';
import {
    Sparkles, ShieldCheck, KeyRound, Cpu, CheckCircle2, AlertCircle,
    Eye, EyeOff, Save, RefreshCw, Trash2, Lock, Server, Zap,
    ArrowRight, Check, Activity, ShieldAlert
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import saApi from '../../../lib/superadmin-api';
import { Skeleton, LogoLoader } from '@workspace/ui';
import clsx from 'clsx';

interface ProviderSummary {
    provider: string;
    displayName: string;
    isConfigured: boolean;
    keyPreview: string | null;
    model: string;
    endpointUrl?: string;
    isActive: boolean;
    isDefault: boolean;
    updatedAt?: string;
    source: 'database' | 'env' | 'none';
}

interface AiVaultResponse {
    defaultProvider: string;
    encryptionProtocol: string;
    providers: ProviderSummary[];
}

const PROVIDER_INFO: Record<string, {
    description: string;
    keyFormat: string;
    docsUrl: string;
    color: string;
    badgeColor: string;
    models: string[];
}> = {
    openai: {
        description: 'Primary GPT-4o & GPT-4o-mini reasoning engine for high-accuracy workflows.',
        keyFormat: 'sk-proj-... or sk-...',
        docsUrl: 'https://platform.openai.com/api-keys',
        color: 'emerald',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        models: ['gpt-4o', 'gpt-4o-mini', 'o1-mini', 'o3-mini', 'gpt-4-turbo']
    },
    gemini: {
        description: 'Google Multimodal AI with extreme token context and rapid multimodal synthesis.',
        keyFormat: 'AIzaSy...',
        docsUrl: 'https://aistudio.google.com/app/apikey',
        color: 'indigo',
        badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash', 'gemini-pro']
    },
    claude: {
        description: 'Anthropic Claude 3.5 for nuanced copywriting, complex coding, and safe agent execution.',
        keyFormat: 'sk-ant-...',
        docsUrl: 'https://console.anthropic.com/settings/keys',
        color: 'amber',
        badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
        models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229']
    },
    groq: {
        description: 'Ultra-low latency LPU inference powering instant chat and voice assistant responses.',
        keyFormat: 'gsk_...',
        docsUrl: 'https://console.groq.com/keys',
        color: 'orange',
        badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
        models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768']
    },
    custom: {
        description: 'Self-hosted vLLM, Ollama, or private enterprise OpenAI-compatible proxy gateway.',
        keyFormat: 'Bearer key or api-token',
        docsUrl: 'https://vllm.ai',
        color: 'purple',
        badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
        models: ['default', 'meta-llama/Meta-Llama-3-70B-Instruct', 'mistralai/Mistral-7B-Instruct-v0.2']
    }
};

export default function PlatformAiVaultPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<AiVaultResponse | null>(null);

    // Form inputs state mapped by provider
    const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
    const [modelInputs, setModelInputs] = useState<Record<string, string>>({});
    const [urlInputs, setUrlInputs] = useState<Record<string, string>>({});
    const [showKey, setShowKey] = useState<Record<string, boolean>>({});

    // Processing states
    const [savingProvider, setSavingProvider] = useState<string | null>(null);
    const [testingProvider, setTestingProvider] = useState<string | null>(null);
    const [settingDefault, setSettingDefault] = useState<string | null>(null);
    const [testResults, setTestResults] = useState<Record<string, { success: boolean; latencyMs?: number; message?: string; error?: string }>>({});

    const loadData = async () => {
        try {
            const res = await saApi.get('/ai');
            if (res.data?.success && res.data?.data) {
                setData(res.data.data);
                const initialModels: Record<string, string> = {};
                const initialUrls: Record<string, string> = {};
                res.data.data.providers.forEach((p: ProviderSummary) => {
                    initialModels[p.provider] = p.model || '';
                    if (p.endpointUrl) initialUrls[p.provider] = p.endpointUrl;
                });
                setModelInputs(initialModels);
                setUrlInputs(initialUrls);
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to load platform AI configuration');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Save key to DB
    const handleSaveKey = async (provider: string) => {
        const apiKey = keyInputs[provider]?.trim();
        if (!apiKey) {
            return toast.error(`Please enter an API key for ${provider.toUpperCase()}`);
        }

        setSavingProvider(provider);
        try {
            const payload = {
                provider,
                apiKey,
                model: modelInputs[provider]?.trim() || undefined,
                endpointUrl: provider === 'custom' ? urlInputs[provider]?.trim() : undefined,
                isActive: true
            };

            const res = await saApi.post('/ai/key', payload);
            toast.success(res.data?.message || `${provider.toUpperCase()} key securely encrypted in database.`);
            // Clear the plaintext input
            setKeyInputs(prev => ({ ...prev, [provider]: '' }));
            setShowKey(prev => ({ ...prev, [provider]: false }));
            await loadData();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || `Failed to save ${provider} key`);
        } finally {
            setSavingProvider(null);
        }
    };

    // Test connection
    const handleTestConnection = async (provider: string) => {
        setTestingProvider(provider);
        setTestResults(prev => ({ ...prev, [provider]: undefined as any }));

        try {
            const payload: any = {
                provider,
                apiKey: keyInputs[provider]?.trim() || undefined,
                model: modelInputs[provider]?.trim() || undefined,
                endpointUrl: provider === 'custom' ? urlInputs[provider]?.trim() : undefined
            };

            const res = await saApi.post('/ai/test', payload);
            if (res.data?.success) {
                const info = res.data.data;
                setTestResults(prev => ({
                    ...prev,
                    [provider]: {
                        success: true,
                        latencyMs: info.latencyMs,
                        message: info.message
                    }
                }));
                toast.success(`${provider.toUpperCase()} connection verified in ${info.latencyMs}ms!`);
            }
        } catch (err: any) {
            const errorMsg = err?.response?.data?.error || err.message || 'Verification failed';
            setTestResults(prev => ({
                ...prev,
                [provider]: {
                    success: false,
                    error: errorMsg
                }
            }));
            toast.error(`Verification failed: ${errorMsg}`);
        } finally {
            setTestingProvider(null);
        }
    };

    // Set default provider
    const handleSetDefault = async (provider: string) => {
        setSettingDefault(provider);
        try {
            await saApi.post('/ai/default', { provider });
            toast.success(`Default AI Provider updated to ${provider.toUpperCase()}`);
            await loadData();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to update default provider');
        } finally {
            setSettingDefault(null);
        }
    };

    // Delete key
    const handleDeleteKey = async (provider: string) => {
        if (!confirm(`Are you sure you want to remove the database key for ${provider.toUpperCase()}? The platform will fall back to environment variables if present.`)) {
            return;
        }

        try {
            await saApi.delete(`/ai/key/${provider}`);
            toast.success(`Removed ${provider.toUpperCase()} key from database`);
            await loadData();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || `Failed to remove key`);
        }
    };

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto space-y-6 pb-16 font-sans">
                <Skeleton className="h-10 w-80 rounded-xl" />
                <Skeleton className="h-4 w-96 rounded-lg" />
                <Skeleton className="h-28 w-full rounded-3xl mt-4" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Skeleton className="h-96 rounded-3xl" />
                    <Skeleton className="h-96 rounded-3xl" />
                </div>
            </div>
        );
    }

    const defaultProv = data?.defaultProvider || 'openai';

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20 font-sans">
            <Toaster position="top-center" />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5 mb-1.5">
                        <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-2xs">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Platform AI Key Vault</h1>
                    </div>
                    <p className="text-xs text-slate-500 font-medium max-w-2xl leading-relaxed">
                        Configure master LLM provider credentials. Keys are encrypted at rest with AES-256-GCM in the database and never exposed in plaintext.
                    </p>
                </div>

                <button
                    onClick={() => { setLoading(true); loadData(); }}
                    className="self-start md:self-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh Vault</span>
                </button>
            </div>

            {/* Encryption & Security Protocol Banner */}
            <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-800 relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                AES-256-GCM Vault Active
                            </span>
                            <span className="px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide bg-slate-800/80 text-slate-300 border border-slate-700/60">
                                NIST SP 800-38D Authenticated Envelope
                            </span>
                        </div>
                        <h2 className="text-lg font-black tracking-tight text-white">Database-Backed AI Credentials Protocol</h2>
                        <p className="text-xs text-slate-300 font-normal leading-relaxed max-w-2xl">
                            All API keys entered here bypass environment files and are persisted directly to the encrypted database table. Each key gets a unique 96-bit random IV and 128-bit authentication tag. Multi-tenant BYOK accounts can still override keys in their own company settings.
                        </p>
                    </div>

                    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 shrink-0 lg:max-w-xs space-y-1.5">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Platform Engine</div>
                        <div className="text-base font-black text-indigo-300 capitalize flex items-center gap-2">
                            <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                            {defaultProv.toUpperCase()}
                        </div>
                        <div className="text-[11px] text-slate-400">
                            Primary fallback engine used for documents, copilot, chat & voice processing.
                        </div>
                    </div>
                </div>
            </div>

            {/* Providers Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {(data?.providers || []).map((prov) => {
                    const info = PROVIDER_INFO[prov.provider] || {
                        description: 'Enterprise LLM provider',
                        keyFormat: 'API Key',
                        docsUrl: '#',
                        color: 'slate',
                        badgeColor: 'bg-slate-50 text-slate-700 border-slate-200',
                        models: []
                    };
                    const isDef = prov.isDefault;
                    const isSaving = savingProvider === prov.provider;
                    const isTesting = testingProvider === prov.provider;
                    const isSettingDef = settingDefault === prov.provider;
                    const testRes = testResults[prov.provider];

                    return (
                        <div 
                            key={prov.provider}
                            className={clsx(
                                "bg-white rounded-3xl p-6 sm:p-7 border transition-all flex flex-col justify-between shadow-2xs",
                                isDef ? "border-indigo-300 ring-2 ring-indigo-500/10 shadow-sm" : "border-slate-200/80"
                            )}
                        >
                            {/* Card Top */}
                            <div className="space-y-5">
                                {/* Header line */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className={clsx(
                                            "w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 border shadow-2xs",
                                            prov.provider === 'openai' && "bg-emerald-50 text-emerald-700 border-emerald-200",
                                            prov.provider === 'gemini' && "bg-indigo-50 text-indigo-700 border-indigo-200",
                                            prov.provider === 'claude' && "bg-amber-50 text-amber-800 border-amber-200",
                                            prov.provider === 'groq' && "bg-orange-50 text-orange-700 border-orange-200",
                                            prov.provider === 'custom' && "bg-purple-50 text-purple-700 border-purple-200",
                                        )}>
                                            <Cpu className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="text-base font-black text-slate-900 tracking-tight">{prov.displayName}</h3>
                                                {isDef && (
                                                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-600 text-white shadow-2xs">
                                                        Default
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 font-medium line-clamp-1">{info.description}</p>
                                        </div>
                                    </div>

                                    {/* Status Badge */}
                                    <span className={clsx(
                                        "text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border shrink-0",
                                        prov.isConfigured 
                                            ? (prov.source === 'database' 
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                                : "bg-blue-50 text-blue-700 border-blue-200")
                                            : "bg-slate-100 text-slate-500 border-slate-200"
                                    )}>
                                        {prov.isConfigured 
                                            ? (prov.source === 'database' ? 'Vault Encrypted' : 'Env Fallback')
                                            : 'Not Configured'}
                                    </span>
                                </div>

                                {/* Stored Key Preview (if configured) */}
                                {prov.isConfigured && prov.keyPreview && (
                                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <span className="text-xs font-mono font-semibold text-slate-700 truncate">{prov.keyPreview}</span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-[10px] font-semibold text-slate-400">
                                                {prov.updatedAt ? new Date(prov.updatedAt).toLocaleDateString() : 'Active'}
                                            </span>
                                            {prov.source === 'database' && (
                                                <button
                                                    type="button"
                                                    title="Delete key from database"
                                                    onClick={() => handleDeleteKey(prov.provider)}
                                                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Key Input Field */}
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                        {prov.isConfigured ? 'Update API Key (Overwrites DB Record)' : 'Enter API Key'}
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showKey[prov.provider] ? 'text' : 'password'}
                                            value={keyInputs[prov.provider] || ''}
                                            onChange={(e) => setKeyInputs(prev => ({ ...prev, [prov.provider]: e.target.value }))}
                                            placeholder={`Paste key (${info.keyFormat})`}
                                            className="w-full px-4 py-2.5 pr-20 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                        />
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setShowKey(prev => ({ ...prev, [prov.provider]: !prev[prov.provider] }))}
                                                className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                {showKey[prov.provider] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Model Selection */}
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                        Model Identifier
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={modelInputs[prov.provider] || ''}
                                            onChange={(e) => setModelInputs(prev => ({ ...prev, [prov.provider]: e.target.value }))}
                                            placeholder="e.g. gpt-4o or default"
                                            className="flex-1 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                        />
                                        {info.models.length > 0 && (
                                            <select
                                                onChange={(e) => {
                                                    if (e.target.value) {
                                                        setModelInputs(prev => ({ ...prev, [prov.provider]: e.target.value }));
                                                    }
                                                }}
                                                value=""
                                                className="px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700 font-medium cursor-pointer"
                                            >
                                                <option value="" disabled>Pick Model</option>
                                                {info.models.map(m => (
                                                    <option key={m} value={m}>{m}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                </div>

                                {/* Custom Endpoint URL (for Custom Provider) */}
                                {prov.provider === 'custom' && (
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                            Custom Gateway Base URL
                                        </label>
                                        <input
                                            type="url"
                                            value={urlInputs[prov.provider] || ''}
                                            onChange={(e) => setUrlInputs(prev => ({ ...prev, [prov.provider]: e.target.value }))}
                                            placeholder="https://api.yourcompany.com/v1"
                                            className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                        />
                                    </div>
                                )}

                                {/* Connection Test Feedback Banner */}
                                {testRes && (
                                    <div className={clsx(
                                        "p-3 rounded-2xl text-xs font-medium flex items-start gap-2.5 transition-all border",
                                        testRes.success 
                                            ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                                            : "bg-rose-50 text-rose-800 border-rose-200"
                                    )}>
                                        {testRes.success ? (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                        ) : (
                                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            {testRes.success ? (
                                                <div>
                                                    <span className="font-bold">Verified ({testRes.latencyMs}ms): </span>
                                                    <span className="text-[11px] opacity-90">{testRes.message}</span>
                                                </div>
                                            ) : (
                                                <div>
                                                    <span className="font-bold">Test Failed: </span>
                                                    <span className="text-[11px] opacity-90">{testRes.error}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Card Actions Bottom */}
                            <div className="pt-5 mt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleTestConnection(prov.provider)}
                                        disabled={isTesting}
                                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                                    >
                                        {isTesting ? <LogoLoader className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
                                        <span>Test Ping</span>
                                    </button>

                                    {!isDef && (
                                        <button
                                            type="button"
                                            onClick={() => handleSetDefault(prov.provider)}
                                            disabled={isSettingDef}
                                            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                                        >
                                            {isSettingDef ? <LogoLoader className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                            <span>Set Default</span>
                                        </button>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleSaveKey(prov.provider)}
                                    disabled={isSaving || !keyInputs[prov.provider]?.trim()}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                                >
                                    {isSaving ? <LogoLoader className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    <span>Encrypt & Save</span>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Platform Settings Quick Link Box */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-slate-100 text-slate-700">
                        <KeyRound className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-slate-900">Need Tenant-Specific BYOK Overrides?</h4>
                        <p className="text-xs text-slate-500 font-medium">
                            Tenants can configure custom keys under their Company Settings. The keys in this vault serve as the master platform infrastructure.
                        </p>
                    </div>
                </div>
                <a
                    href="/superadmin/companies"
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 active:scale-95"
                >
                    <span>Manage Companies</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                </a>
            </div>
        </div>
    );
}
