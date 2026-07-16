'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Brain, Cpu, Zap, Info, Loader2, Save, Activity, ShieldCheck, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { useSettings } from '@/lib/settings-context';
import clsx from 'clsx';

function InfoLink({ href, label }: { href: string; label: string }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-700 font-medium ml-2 transition-colors cursor-pointer"
        >
            <Info className="w-3 h-3" />
            <span>{label}</span>
        </a>
    );
}

export default function AiTab() {
    const { settings: globalSettings, refreshSettings: refreshGlobalSettings } = useSettings();
    const [saving, setSaving] = useState(false);
    const [testingAi, setTestingAi] = useState(false);
    const [showPw, setShowPw] = useState(false);

    // AI Settings State
    const [aiProvider, setAiProvider] = useState<'none' | 'openai' | 'claude' | 'gemini' | 'custom'>(globalSettings?.aiProvider || 'none');
    const [openaiKey, setOpenaiKey] = useState(globalSettings?.openaiKey || '');
    const [claudeKey, setClaudeKey] = useState(globalSettings?.claudeKey || '');
    const [geminiKey, setGeminiKey] = useState(globalSettings?.geminiKey || '');
    const [customAiUrl, setCustomAiUrl] = useState(globalSettings?.customAiUrl || '');
    const [customAiKey, setCustomAiKey] = useState(globalSettings?.customAiKey || '');
    const [customAiModel, setCustomAiModel] = useState(globalSettings?.customAiModel || '');
    const [aiTestStatus, setAiTestStatus] = useState<'success' | 'failure' | 'none'>(globalSettings?.lastAiTestStatus || 'none');

    useEffect(() => {
        if (globalSettings) {
            setAiProvider(globalSettings.aiProvider || 'none');
            setOpenaiKey(globalSettings.openaiKey || '');
            setClaudeKey(globalSettings.claudeKey || '');
            setGeminiKey(globalSettings.geminiKey || '');
            setCustomAiUrl(globalSettings.customAiUrl || '');
            setCustomAiKey(globalSettings.customAiKey || '');
            setCustomAiModel(globalSettings.customAiModel || '');
            setAiTestStatus(globalSettings.lastAiTestStatus || 'none');
        }
    }, [globalSettings]);

    const saveAiSettings = async () => {
        setSaving(true);
        try {
            const payload: any = { aiProvider };
            if (openaiKey) payload.openaiKey = openaiKey;
            if (claudeKey) payload.claudeKey = claudeKey;
            if (geminiKey) payload.geminiKey = geminiKey;
            if (customAiUrl) payload.customAiUrl = customAiUrl;
            if (customAiKey) payload.customAiKey = customAiKey;
            if (customAiModel) payload.customAiModel = customAiModel;

            await api.put('/api/settings', payload);
            toast.success('AI configuration saved successfully');
            await refreshGlobalSettings(true);
        } catch (e: any) {
            toast.error(e?.response?.data?.error || 'Failed to update AI settings');
        } finally {
            setSaving(false);
        }
    };

    const testAiConnection = async () => {
        setTestingAi(true);
        try {
            // First save
            const payload: any = { aiProvider };
            if (openaiKey) payload.openaiKey = openaiKey;
            if (claudeKey) payload.claudeKey = claudeKey;
            if (geminiKey) payload.geminiKey = geminiKey;
            if (customAiUrl) payload.customAiUrl = customAiUrl;
            if (customAiKey) payload.customAiKey = customAiKey;
            if (customAiModel) payload.customAiModel = customAiModel;

            await api.put('/api/settings', payload);

            const { data } = await api.post('/api/settings/test-ai');
            setAiTestStatus('success');
            toast.success(data.message || 'AI Connection verified!');
            await refreshGlobalSettings(true);
        } catch (e: any) {
            setAiTestStatus('failure');
            toast.error(e?.response?.data?.details || e?.response?.data?.error || 'AI Connection test failed');
        } finally {
            setTestingAi(false);
        }
    };

    return (
        <div className="max-w-xl space-y-6">
            <div className="card">
                <div className="card-header flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Brain className="w-5 h-5 text-purple-600" />
                        <h2 className="font-semibold text-gray-900">AI Logic Configuration</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        {aiTestStatus === 'success' && (
                            <span className="badge badge-green flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" /> Connected
                            </span>
                        )}
                        {aiTestStatus === 'failure' && (
                            <span className="badge badge-red flex items-center gap-1 text-[10px]">
                                <ShieldAlert className="w-3 h-3" /> Connection Failed
                            </span>
                        )}
                    </div>
                </div>
                <div className="card-body space-y-4">
                    <p className="text-xs text-gray-500 mb-4">
                        Select your preferred AI model to power dashboard insights, project risk analysis, and automated reporting.
                    </p>

                    <div>
                        <label className="label">Active AI Provider</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {[
                                { id: 'none', label: 'Disabled', icon: Cpu },
                                { id: 'gemini', label: 'Google Gemini', icon: Zap },
                                { id: 'openai', label: 'OpenAI (GPT)', icon: Brain },
                                { id: 'claude', label: 'Claude', icon: Cpu },
                                { id: 'custom', label: 'Custom (Unified)', icon: Activity },
                            ].map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => setAiProvider(p.id as any)}
                                    className={clsx(
                                        "flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all gap-2",
                                        aiProvider === p.id
                                            ? "border-purple-600 bg-purple-50 text-purple-600 ring-2 ring-purple-100"
                                            : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                                    )}
                                >
                                    <p.icon className="w-4 h-4" />
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {aiProvider === 'gemini' && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="label">
                                Google Gemini API Key
                                <InfoLink href="https://aistudio.google.com/app/apikey" label="Get Gemini Key" />
                            </label>
                            <div className="relative">
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    value={geminiKey}
                                    onChange={e => setGeminiKey(e.target.value)}
                                    placeholder="Enter your Gemini API Key..."
                                    className="input bg-white pr-10"
                                />
                                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10 cursor-pointer">
                                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                                <Zap className="w-3 h-3" /> Recommend using <b>gemini-1.5-flash</b> for cost and speed. Create a project in AI Studio to get started.
                            </p>
                        </div>
                    )}

                    {aiProvider === 'openai' && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="label">
                                OpenAI API Key
                                <InfoLink href="https://platform.openai.com/api-keys" label="Get OpenAI Key" />
                            </label>
                            <div className="relative">
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    value={openaiKey}
                                    onChange={e => setOpenaiKey(e.target.value)}
                                    placeholder="sk-..."
                                    className="input bg-white pr-10"
                                />
                                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10 cursor-pointer">
                                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">
                                Ensure your OpenAI account has credits available ($5 minimum recommended) to avoid 429 quota errors.
                            </p>
                        </div>
                    )}

                    {aiProvider === 'claude' && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="label">
                                Claude API Key
                                <InfoLink href="https://console.anthropic.com/settings/keys" label="Get Claude Key" />
                            </label>
                            <div className="relative">
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    value={claudeKey}
                                    onChange={e => setClaudeKey(e.target.value)}
                                    placeholder="sk-ant-..."
                                    className="input bg-white pr-10"
                                />
                                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10 cursor-pointer">
                                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                                <Cpu className="w-3 h-3" /> Using <b>claude-3-5-sonnet</b> for intelligent, nuanced generation. Ensure credits are available.
                            </p>
                        </div>
                    )}

                    {aiProvider === 'custom' && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
                            <div>
                                <label className="label">Base URL</label>
                                <input
                                    value={customAiUrl}
                                    onChange={e => setCustomAiUrl(e.target.value)}
                                    placeholder="e.g. https://openrouter.ai/api/v1"
                                    className="input bg-white"
                                />
                            </div>
                            <div>
                                <label className="label">API Key</label>
                                <div className="relative">
                                    <input
                                        type={showPw ? 'text' : 'password'}
                                        value={customAiKey}
                                        onChange={e => setCustomAiKey(e.target.value)}
                                        placeholder="Enter your custom API key..."
                                        className="input bg-white pr-10"
                                    />
                                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10 cursor-pointer">
                                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="label">Model Name</label>
                                <input
                                    value={customAiModel}
                                    onChange={e => setCustomAiModel(e.target.value)}
                                    placeholder="e.g. meta-llama/llama-3.1-8b-instruct"
                                    className="input bg-white"
                                />
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                                <Activity className="w-3 h-3" /> Connect to any OpenAI-compatible endpoint like OpenRouter, Groq, TogetherAI, or Ollama.
                            </p>
                        </div>
                    )}

                    <div className="pt-4 flex gap-3">
                        <button onClick={saveAiSettings} disabled={saving} className="btn-primary flex-1">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {saving ? 'Saving...' : 'Save Settings'}
                        </button>
                        <button
                            onClick={testAiConnection}
                            disabled={testingAi || aiProvider === 'none'}
                            className={clsx(
                                "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl border text-sm font-medium transition-all",
                                aiTestStatus === 'success' ? "border-green-200 bg-green-50 text-green-700 font-bold" : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
                            )}
                        >
                            {testingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                            {testingAi ? 'Validating...' : 'Connect & Test'}
                        </button>
                    </div>

                    {globalSettings?.lastAiTestDate && (
                        <p className="text-[10px] text-gray-400 text-center">
                            Last tested: {new Date(globalSettings.lastAiTestDate).toLocaleString()}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
