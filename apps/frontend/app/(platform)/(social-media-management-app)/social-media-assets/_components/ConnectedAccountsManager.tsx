'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { 
    Instagram, Linkedin, Youtube, CheckCircle2, 
    AlertCircle, Link2, Unlink, RefreshCw, Sparkles, ShieldCheck, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const PLATFORM_CONFIGS = [
    {
        platform: 'instagram',
        name: 'Instagram Business / Creator',
        icon: Instagram,
        color: 'from-pink-500 to-rose-600',
        textColor: 'text-pink-500',
        bgColor: 'bg-pink-500/10',
        dailyQuota: '100 Reels & Posts / day',
        cost: '$0.00 API Cost (Direct Graph API)',
        scopes: ['instagram_basic', 'instagram_content_publish', 'instagram_manage_comments']
    },
    {
        platform: 'facebook',
        name: 'Facebook Page',
        icon: Link2,
        color: 'from-blue-600 to-indigo-600',
        textColor: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        dailyQuota: 'Unlimited Page Videos & Posts',
        cost: '$0.00 API Cost (Direct Graph API)',
        scopes: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts']
    },
    {
        platform: 'linkedin',
        name: 'LinkedIn Organization / Profile',
        icon: Linkedin,
        color: 'from-sky-600 to-blue-700',
        textColor: 'text-sky-500',
        bgColor: 'bg-sky-500/10',
        dailyQuota: '100 Posts / 24h per Member',
        cost: '$0.00 API Cost (Community REST API)',
        scopes: ['w_member_social', 'w_organization_social', 'r_basicprofile']
    },
    {
        platform: 'tiktok',
        name: 'TikTok Direct Post',
        icon: Zap,
        color: 'from-gray-900 to-black dark:from-slate-800 dark:to-slate-900',
        textColor: 'text-rose-500',
        bgColor: 'bg-rose-500/10',
        dailyQuota: 'Direct Creator Video Publishing',
        cost: '$0.00 API Cost (Content Posting API v2)',
        scopes: ['video.publish', 'video.upload', 'user.info.basic']
    },
    {
        platform: 'youtube',
        name: 'YouTube Shorts & Channel',
        icon: Youtube,
        color: 'from-red-600 to-rose-700',
        textColor: 'text-red-500',
        bgColor: 'bg-red-500/10',
        dailyQuota: '10,000 Free Units / Day (50 Videos)',
        cost: '$0.00 API Cost (YouTube Data API v3)',
        scopes: ['youtube.upload', 'youtube.readonly']
    }
];

export function ConnectedAccountsManager({ projectId }: { projectId?: string }) {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
    const [selectionId, setSelectionId] = useState<string | null>(null);

    useEffect(() => {
        loadAccounts();
    }, [projectId]);

    const loadAccounts = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/api/social-media/accounts', {
                params: { projectId: projectId || undefined }
            });
            if (data.success) {
                setAccounts(data.accounts || []);
            }
        } catch (err: any) {
            toast.error('Failed to load connected social accounts');
        } finally {
            setLoading(false);
        }
    };

    // Real OAuth: the server returns the provider's authorize URL; the provider comes back to the server callback,
    // which redirects here with ?status=connected|select|error (see packages/.../publishing/oauth.service.ts).
    const handleConnectAccount = async (cfg: typeof PLATFORM_CONFIGS[0]) => {
        setConnectingPlatform(cfg.platform);
        try {
            const redirectUri = `${window.location.origin}${window.location.pathname}`;
            const { data } = await api.get(`/api/social-media/accounts/oauth/${cfg.platform}/authorize`, {
                params: { projectId: projectId || undefined, redirectUri, client: 'web' },
            });
            if (!data?.url) throw new Error('The server did not return an authorization URL.');
            window.location.assign(data.url);
        } catch (err: any) {
            const code = err.response?.data?.code;
            const msg = err.response?.data?.error || err.response?.data?.message || err.message;
            toast.error(code === 'PUBLISH_NOT_CONFIGURED'
                ? `${cfg.name} is not set up on this server yet (missing app credentials).`
                : msg || `Failed to connect ${cfg.name}`);
            setConnectingPlatform(null);
        }
    };

    // Return leg of OAuth: read the result from the URL once, then clean it.
    useEffect(() => {
        const q = new URLSearchParams(window.location.search);
        const status = q.get('status');
        if (!status) return;
        const platform = q.get('platform') || 'Account';
        if (status === 'connected') {
            toast.success(`${platform} connected`);
            loadAccounts();
        } else if (status === 'select' && q.get('selectionId')) {
            setSelectionId(q.get('selectionId'));
        } else if (status === 'error') {
            toast.error(`${platform}: ${q.get('error_description') || q.get('error') || 'connection failed'}`);
        }
        ['status', 'platform', 'accountId', 'accountIds', 'selectionId', 'count', 'error', 'error_description'].forEach((k) => q.delete(k));
        const rest = q.toString();
        window.history.replaceState(null, '', `${window.location.pathname}${rest ? `?${rest}` : ''}`);
    }, []);

    const handleDisconnectAccount = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to disconnect ${name}? Scheduled posts for this channel will be paused.`)) return;
        try {
            await api.delete(`/api/social-media/accounts/${id}`);
            toast.success(`Disconnected ${name}`);
            setAccounts(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            toast.error('Failed to disconnect account');
        }
    };

    return (
        <div className="space-y-8 max-w-5xl">
            {/* Header / Info Panel */}
            <div className="backdrop-blur-md bg-white/60 dark:bg-black/60 border border-white/20 dark:border-white/10 rounded-2xl p-6 shadow-lg shadow-black/5 dark:shadow-[0_0_40px_rgba(255,255,255,0.05)]">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                                Zero-Cost Connected Social Channels
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                                Connect official client profiles via OAuth 2.0 user consent. Quotas apply per profile at $0.00 platform cost.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Zero-Cost Model Verified
                    </div>
                </div>
            </div>

            {/* Channels Card Deck */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {PLATFORM_CONFIGS.map((cfg) => {
                    const connected = accounts.find(a => a.platform === cfg.platform);
                    const Icon = cfg.icon;

                    return (
                        <div
                            key={cfg.platform}
                            className="backdrop-blur-md bg-white/60 dark:bg-black/60 border border-white/20 dark:border-white/10 rounded-2xl p-6 shadow-lg shadow-black/5 dark:shadow-[0_0_40px_rgba(255,255,255,0.05)] flex flex-col justify-between space-y-5 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
                        >
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className={`w-12 h-12 rounded-2xl ${cfg.bgColor} ${cfg.textColor} flex items-center justify-center font-bold shadow-sm`}>
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                                        connected
                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                            : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400'
                                    }`}>
                                        {connected ? '● Connected' : 'Not Linked'}
                                    </span>
                                </div>

                                <div>
                                    <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">
                                        {cfg.name}
                                    </h3>
                                    {connected ? (
                                        <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                                            {connected.username || connected.accountName}
                                        </p>
                                    ) : (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            Authorize via OAuth 2.0
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-400">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400">API Quota:</span>
                                        <span className="font-semibold text-gray-700 dark:text-gray-300">{cfg.dailyQuota}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400">Platform Cost:</span>
                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{cfg.cost}</span>
                                    </div>
                                </div>
                            </div>

                            {connected?.reauthRequired && (
                                <button
                                    onClick={() => handleConnectAccount(cfg)}
                                    disabled={connectingPlatform === cfg.platform}
                                    className="mb-2 w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all min-h-[44px]"
                                >
                                    <AlertCircle className="w-3.5 h-3.5" /> {connectingPlatform === cfg.platform ? 'Authorizing...' : 'Reconnect: access expired'}
                                </button>
                            )}
                            {connected ? (
                                <button
                                    onClick={() => handleDisconnectAccount(connected.id, cfg.name)}
                                    className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl border border-rose-200 dark:border-rose-900/50 flex items-center justify-center gap-2 transition-all min-h-[44px]"
                                >
                                    <Unlink className="w-3.5 h-3.5" /> Disconnect Channel
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleConnectAccount(cfg)}
                                    disabled={connectingPlatform === cfg.platform}
                                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all min-h-[44px]"
                                >
                                    {connectingPlatform === cfg.platform ? (
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Link2 className="w-3.5 h-3.5" />
                                    )}
                                    {connectingPlatform === cfg.platform ? 'Authorizing...' : 'Connect Channel'}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
            {selectionId && (
                <AccountSelectionDialog
                    selectionId={selectionId}
                    onClose={() => setSelectionId(null)}
                    onConnected={() => { setSelectionId(null); loadAccounts(); }}
                />
            )}
        </div>
    );
}

type Candidate = { candidateId: string; kind: string; accountName: string; username?: string | null; profileImageUrl?: string | null };

const KIND_LABELS: Record<string, string> = {
    page: 'Facebook Page', instagram_business: 'Instagram account', member: 'Personal profile',
    organization: 'Company page', channel: 'YouTube channel', user: 'Profile',
};

/** Pick which Pages / Instagram accounts / LinkedIn organisations to connect after OAuth (status=select). */
function AccountSelectionDialog({ selectionId, onClose, onConnected }: { selectionId: string; onClose: () => void; onConnected: () => void }) {
    const [candidates, setCandidates] = useState<Candidate[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [picked, setPicked] = useState<Set<string>>(new Set());
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setError(null);
        setCandidates(null);
        try {
            const { data } = await api.get(`/api/social-media/accounts/oauth/selections/${encodeURIComponent(selectionId)}`);
            setCandidates(data.candidates || []);
        } catch (err: any) {
            setError(err.response?.data?.error || err.response?.data?.message || 'Could not load the accounts to choose from.');
        }
    };
    useEffect(() => { load(); }, [selectionId]);

    const connect = async () => {
        setSaving(true);
        try {
            const { data } = await api.post(`/api/social-media/accounts/oauth/selections/${encodeURIComponent(selectionId)}`, { candidateIds: [...picked] });
            const n = (data.accounts || []).length;
            toast.success(n === 1 ? `${data.accounts[0].accountName} connected` : `${n} accounts connected`);
            onConnected();
        } catch (err: any) {
            toast.error(err.response?.data?.error || err.response?.data?.message || 'Could not connect the chosen accounts.');
        } finally {
            setSaving(false);
        }
    };

    const toggle = (id: string) => setPicked((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });

    return (
        <div role="dialog" aria-modal="true" aria-labelledby="acct-select-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-xl">
                <h2 id="acct-select-title" className="text-lg font-semibold text-white">Choose accounts to connect</h2>
                <p className="mt-1 text-sm text-zinc-400">Only the accounts you tick are connected.</p>
                <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
                    {!candidates && !error && [0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-white/5" />)}
                    {error && (
                        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                            <p>{error}</p>
                            <div className="mt-2 flex gap-3">
                                <button className="min-h-[44px] font-medium underline" onClick={load}>Retry</button>
                                <button className="min-h-[44px] font-medium underline" onClick={onClose}>Connect again later</button>
                            </div>
                        </div>
                    )}
                    {candidates && candidates.length === 0 && (
                        <div className="rounded-xl bg-white/5 p-4 text-sm text-zinc-300">
                            No pages or organisations were shared. Connect again and allow access to at least one.
                            <button className="mt-2 block min-h-[44px] font-medium underline" onClick={onClose}>Close</button>
                        </div>
                    )}
                    {candidates?.map((c) => (
                        <label key={c.candidateId} className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl bg-white/5 p-3 hover:bg-white/10">
                            <input type="checkbox" className="h-5 w-5" checked={picked.has(c.candidateId)} onChange={() => toggle(c.candidateId)} />
                            {c.profileImageUrl ? <img src={c.profileImageUrl} alt="" className="h-8 w-8 rounded-full" /> : <div className="h-8 w-8 rounded-full bg-white/10" />}
                            <span className="min-w-0">
                                <span className="block truncate text-sm font-medium text-white">{c.accountName}</span>
                                <span className="block truncate text-xs text-zinc-400">{KIND_LABELS[c.kind] || c.kind}{c.username ? ` · @${c.username}` : ''}</span>
                            </span>
                        </label>
                    ))}
                </div>
                <div className="mt-5 flex justify-end gap-2">
                    <button className="min-h-[44px] rounded-xl px-4 text-sm text-zinc-300 hover:bg-white/5" onClick={onClose}>Cancel</button>
                    <button
                        className="min-h-[44px] rounded-xl bg-white px-4 text-sm font-semibold text-black disabled:opacity-40"
                        disabled={saving || picked.size === 0}
                        onClick={connect}
                    >
                        {saving ? 'Connecting…' : picked.size ? `Connect ${picked.size}` : 'Pick at least one'}
                    </button>
                </div>
            </div>
        </div>
    );
}
