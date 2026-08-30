'use client';

import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Copy, 
  Check, 
  ExternalLink, 
  Trash2, 
  RefreshCw, 
  ShieldCheck, 
  Server, 
  X,
  HelpCircle,
  Zap,
  Sparkles
} from 'lucide-react';
import { LogoLoader } from './LogoLoader';

export interface DnsRecord {
  type: 'A' | 'CNAME' | 'TXT';
  name: string;
  value: string;
  ttl?: number;
  description: string;
  status?: 'valid' | 'pending' | 'failed';
}

export interface DomainData {
  domain: string;
  type: 'ADVERTISING_WEBSITE' | 'TRAFFIC_LINK' | 'COMPANY_PROFILE';
  targetId: string;
  status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'FAILED' | 'REMOVED';
  sslStatus: 'PENDING' | 'ACTIVE' | 'FAILED';
  isApex: boolean;
  records: DnsRecord[];
  verifiedAt?: string | null;
}

export interface DomainManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'ADVERTISING_WEBSITE' | 'TRAFFIC_LINK' | 'COMPANY_PROFILE';
  targetId: string;
  targetName?: string;
  initialDomain?: string | null;
  apiBaseUrl?: string;
  onDomainSaved?: (domain: string) => void;
  onDomainRemoved?: () => void;
}

export const DomainManagerModal: React.FC<DomainManagerModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetName = 'Resource',
  initialDomain = null,
  apiBaseUrl = '',
  onDomainSaved,
  onDomainRemoved
}) => {
  const [domainMode, setDomainMode] = useState<'subdomain' | 'custom_domain'>('subdomain');
  const [subdomainSlug, setSubdomainSlug] = useState('');
  const [customDomainInput, setCustomDomainInput] = useState(initialDomain || '');
  const [activeDomainData, setActiveDomainData] = useState<DomainData | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const platformRoot = (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_ROOT_DOMAIN) 
    ? process.env.NEXT_PUBLIC_ROOT_DOMAIN 
    : '180workspace.com';

  const cleanCustomInput = customDomainInput.trim().toLowerCase().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  const isApex = cleanCustomInput ? cleanCustomInput.split('.').filter(Boolean).length <= 2 : false;
  const cleanSubdomain = subdomainSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');

  useEffect(() => {
    if (isOpen && initialDomain) {
      if (initialDomain.includes(platformRoot)) {
        setDomainMode('subdomain');
        setSubdomainSlug(initialDomain.replace(`.${platformRoot}`, ''));
      } else {
        setDomainMode('custom_domain');
        setCustomDomainInput(initialDomain);
      }
      fetchDomainStatus(initialDomain);
    } else if (isOpen) {
      setActiveDomainData(null);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen, initialDomain, platformRoot]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const fetchDomainStatus = async (domainToFetch: string) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const base = apiBaseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
      const res = await fetch(`${base}/api/v1/domains/${encodeURIComponent(domainToFetch)}/status`);
      if (res.ok) {
        const data = await res.json();
        if (data.data) {
          setActiveDomainData(data.data);
        }
      }
    } catch (err: any) {
      console.warn('Could not fetch domain status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectSubdomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cleanSubdomain || cleanSubdomain.length < 2) {
      setErrorMessage('Please enter a valid subdomain prefix (e.g. "promo" or "mybrand")');
      return;
    }

    const fullSubdomain = `${cleanSubdomain}.${platformRoot}`;
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const base = apiBaseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
      const res = await fetch(`${base}/api/v1/domains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: fullSubdomain,
          type: targetType,
          targetId
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to connect platform subdomain');
      }

      // Native platform subdomains are immediately active
      setActiveDomainData({
        ...json.data,
        status: 'ACTIVE',
        sslStatus: 'ACTIVE',
        verifiedAt: new Date().toISOString()
      });
      setSuccessMessage(`🎉 Platform subdomain https://${fullSubdomain} connected and active!`);
      if (onDomainSaved) onDomainSaved(fullSubdomain);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error connecting platform subdomain');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectCustomDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cleanCustomInput || !cleanCustomInput.includes('.')) {
      setErrorMessage('Please enter a valid custom domain (e.g. "yourbrand.com" or "go.yourbrand.com")');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const base = apiBaseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
      const res = await fetch(`${base}/api/v1/domains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: cleanCustomInput,
          type: targetType,
          targetId
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to register custom domain');
      }

      setActiveDomainData(json.data);
      setSuccessMessage('Domain added! Please configure the DNS records shown below.');
      if (onDomainSaved) onDomainSaved(cleanCustomInput);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error connecting custom domain');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDns = async () => {
    if (!activeDomainData?.domain) return;
    setVerifying(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const base = apiBaseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
      const res = await fetch(`${base}/api/v1/domains/${encodeURIComponent(activeDomainData.domain)}/verify`, {
        method: 'POST'
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'DNS Verification failed');
      }

      setActiveDomainData(prev => prev ? {
        ...prev,
        status: json.status,
        sslStatus: json.sslStatus,
        records: json.records || prev.records,
        verifiedAt: json.verified ? new Date().toISOString() : prev.verifiedAt
      } : null);

      if (json.verified) {
        setSuccessMessage('🎉 DNS verified successfully! Free SSL certificate is active.');
      } else {
        setErrorMessage(json.diagnostics?.message || 'DNS records have not propagated yet. Please allow up to 15 minutes.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to verify DNS records');
    } finally {
      setVerifying(false);
    }
  };

  const handleDisconnect = async () => {
    if (!activeDomainData?.domain) return;
    if (!window.confirm(`Are you sure you want to disconnect ${activeDomainData.domain}? Traffic to this domain will stop routing.`)) {
      return;
    }

    setLoading(true);
    try {
      const base = apiBaseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
      await fetch(`${base}/api/v1/domains/${encodeURIComponent(activeDomainData.domain)}`, {
        method: 'DELETE'
      });

      setActiveDomainData(null);
      setCustomDomainInput('');
      setSubdomainSlug('');
      setSuccessMessage('Domain disconnected successfully.');
      if (onDomainRemoved) onDomainRemoved();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to disconnect domain');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Domain & Subdomain Manager
                {activeDomainData?.status === 'ACTIVE' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Live & Active
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Connect a native platform subdomain or your own branded custom domain to {targetName}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <div className="text-xs leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              <div className="text-xs leading-relaxed font-medium">{successMessage}</div>
            </div>
          )}

          {!activeDomainData ? (
            <div className="space-y-5">
              {/* Option Selector Toggle */}
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => { setDomainMode('subdomain'); setErrorMessage(null); }}
                  className={`py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${
                    domainMode === 'subdomain'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Platform Subdomain</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">Instant</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setDomainMode('custom_domain'); setErrorMessage(null); }}
                  className={`py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${
                    domainMode === 'custom_domain'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Globe className="w-4 h-4 text-indigo-500" />
                  <span>Your Custom Domain</span>
                </button>
              </div>

              {/* Mode 1: Platform Subdomain */}
              {domainMode === 'subdomain' && (
                <form onSubmit={handleConnectSubdomain} className="space-y-4 animate-in fade-in duration-200">
                  <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider">
                        Zero-DNS Instant Subdomain
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      Choose a prefix to launch your link on our native domain (e.g. <code>https://mybrand.{platformRoot}</code>). No DNS setup required.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                      Subdomain Prefix
                    </label>
                    <div className="flex items-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-indigo-500">
                      <input
                        type="text"
                        value={subdomainSlug}
                        onChange={(e) => setSubdomainSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                        placeholder="e.g. mybrand or promo"
                        className="flex-1 pl-4 py-3 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none font-mono text-sm"
                      />
                      <span className="px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-mono text-xs border-l border-slate-200 dark:border-slate-700 select-none">
                        .{platformRoot}
                      </span>
                    </div>
                    {cleanSubdomain && (
                      <p className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 font-mono">
                        Your URL will be: <strong>https://{cleanSubdomain}.{platformRoot}</strong>
                      </p>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading || !cleanSubdomain}
                      className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
                    >
                      {loading ? <LogoLoader className="w-4 h-4 animate-spin text-white" /> : <Zap className="w-4 h-4" />}
                      Connect Platform Subdomain Instantly
                    </button>
                  </div>
                </form>
              )}

              {/* Mode 2: External Custom Domain */}
              {domainMode === 'custom_domain' && (
                <form onSubmit={handleConnectCustomDomain} className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                      Your Custom Domain or Subdomain
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={customDomainInput}
                        onChange={(e) => setCustomDomainInput(e.target.value)}
                        placeholder="e.g. go.yourbrand.com or yourbrand.com"
                        className="w-full pl-4 pr-32 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 font-mono text-sm shadow-sm"
                      />
                      {cleanCustomInput && (
                        <span className="absolute right-3 px-2 py-1 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {isApex ? 'Apex Domain' : 'Subdomain'}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      Requires adding a DNS record in your domain registrar (GoDaddy, Cloudflare, etc.).
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading || !cleanCustomInput}
                      className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
                    >
                      {loading ? <LogoLoader className="w-4 h-4 animate-spin text-white" /> : <Globe className="w-4 h-4" />}
                      Generate DNS Records & Connect
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* Connected Domain View */
            <div className="space-y-6">
              {/* Domain Header Card */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Connected Domain</span>
                  <div className="text-base font-bold text-slate-900 dark:text-white font-mono flex items-center gap-2">
                    {activeDomainData.domain}
                    <span className="text-xs font-normal text-slate-400">
                      ({activeDomainData.domain.includes(platformRoot) ? 'Platform Native' : (activeDomainData.isApex ? 'Apex Root' : 'Subdomain')})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!activeDomainData.domain.includes(platformRoot) && (
                    <button
                      onClick={handleVerifyDns}
                      disabled={verifying}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
                      {verifying ? 'Verifying...' : 'Verify DNS'}
                    </button>
                  )}
                  <button
                    onClick={handleDisconnect}
                    disabled={loading}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                    title="Disconnect Domain"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Status Banner */}
              <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                activeDomainData.status === 'ACTIVE'
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300'
                  : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300'
              }`}>
                {activeDomainData.status === 'ACTIVE' ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="font-bold text-xs">
                    {activeDomainData.status === 'ACTIVE' 
                      ? 'Domain Active & Routing Traffic with Free SSL' 
                      : 'DNS Records Pending Configuration'}
                  </h4>
                  <p className="text-xs opacity-90 mt-0.5">
                    {activeDomainData.status === 'ACTIVE'
                      ? `Traffic to https://${activeDomainData.domain} is automatically directed to this ${targetName}.`
                      : 'Log in to your DNS provider (e.g. GoDaddy, Cloudflare, Namecheap) and add the records below.'}
                  </p>
                </div>
              </div>

              {/* DNS Records Table (Only for External Domains) */}
              {!activeDomainData.domain.includes(platformRoot) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      Required DNS Records
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Server className="w-3 h-3" /> Automatic SSL Handled
                    </span>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold">
                          <th className="py-2.5 px-3 border-b border-slate-200 dark:border-slate-800">Type</th>
                          <th className="py-2.5 px-3 border-b border-slate-200 dark:border-slate-800">Name / Host</th>
                          <th className="py-2.5 px-3 border-b border-slate-200 dark:border-slate-800">Target / Value</th>
                          <th className="py-2.5 px-3 border-b border-slate-200 dark:border-slate-800 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                        {activeDomainData.records?.map((record, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="py-2.5 px-3 font-bold text-indigo-600 dark:text-indigo-400">
                              {record.type}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-semibold">
                              <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                {record.name}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 select-all max-w-[200px] truncate" title={record.value}>
                              {record.value}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={() => copyToClipboard(record.value, `rec-${idx}`)}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-sans font-medium transition-colors"
                                title="Copy Target Value"
                              >
                                {copiedKey === `rec-${idx}` ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Copied
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" /> Copy
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div className="text-[11px] text-slate-400">
            Zero-configuration SSL renewal provided automatically
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs rounded-xl hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
