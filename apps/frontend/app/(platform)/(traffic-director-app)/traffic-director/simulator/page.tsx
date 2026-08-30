"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Play, Sparkles, CheckCircle2, XCircle, ArrowRight, 
  ExternalLink, Globe, Smartphone, Bot, RotateCcw, HelpCircle, Layers, Shield 
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { LogoLoader } from '@workspace/ui';
import CustomSelect from '@/components/ui/CustomSelect';

const PRESETS = [
  {
    name: 'Real iPhone 15 (Human Touch)',
    ip: '104.28.19.45',
    country: 'US',
    city: 'Los Angeles',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    networkType: 'residential',
    asnOrg: undefined,
    touchPoints: 5,
    gpuRenderer: 'Apple GPU (A16 Bionic)',
    batteryLevel: 0.68
  },
  {
    name: 'AWS Headless Bot (SwiftShader & No Touch)',
    ip: '54.239.28.85',
    country: 'US',
    city: 'Ashburn',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    networkType: 'datacenter',
    asnOrg: 'AWS',
    touchPoints: 0,
    gpuRenderer: 'Google SwiftShader (CPU Software Rasterizer)',
    batteryLevel: 1.0
  },
  {
    name: 'GCP Scraper / Cloud Runner',
    ip: '34.102.136.1',
    country: 'US',
    city: 'Council Bluffs',
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/122.0.0.0 Safari/537.36',
    networkType: 'datacenter',
    asnOrg: 'GOOGLE_CLOUD',
    touchPoints: 0,
    gpuRenderer: 'llvmpipe (LLVM 15.0.7, 256 bits)',
    batteryLevel: 1.0
  },
  {
    name: 'UK Desktop Chrome (NVIDIA GPU)',
    ip: '82.165.197.1',
    country: 'GB',
    city: 'London',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    networkType: 'residential',
    asnOrg: undefined,
    touchPoints: 0,
    gpuRenderer: 'NVIDIA GeForce RTX 4080',
    batteryLevel: 1.0
  }
];

function TrafficSimulatorContent() {
  const searchParams = useSearchParams();
  const defaultLinkId = searchParams?.get('linkId') || '';

  const [links, setLinks] = useState<any[]>([]);
  const [selectedLinkId, setSelectedLinkId] = useState(defaultLinkId);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);

  // Simulation Form State
  const [simulatedIp, setSimulatedIp] = useState('104.28.19.45');
  const [simulatedCountry, setSimulatedCountry] = useState('US');
  const [simulatedCity, setSimulatedCity] = useState('Los Angeles');
  const [simulatedUserAgent, setSimulatedUserAgent] = useState('Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1');
  const [simulatedReferrer, setSimulatedReferrer] = useState('https://google.com');
  const [simulatedNetworkType, setSimulatedNetworkType] = useState<string>('residential');
  const [simulatedAsnOrg, setSimulatedAsnOrg] = useState<string>('');
  const [simulatedTouchPoints, setSimulatedTouchPoints] = useState<number>(5);
  const [simulatedGpuRenderer, setSimulatedGpuRenderer] = useState<string>('Apple GPU (A16 Bionic)');
  const [simulatedBatteryLevel, setSimulatedBatteryLevel] = useState<number>(0.68);
  const [simulatedQueryKey, setSimulatedQueryKey] = useState('utm_source');
  const [simulatedQueryVal, setSimulatedQueryVal] = useState('google');

  // Simulation Output
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/traffic-director/links');
      const fetchedLinks = res.data?.data?.links || [];
      setLinks(fetchedLinks);
      if (!selectedLinkId && fetchedLinks.length > 0) {
        setSelectedLinkId(fetchedLinks[0].id);
      }
    } catch (error) {
      console.error('Failed to load links:', error);
      setLinks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    setSimulatedIp(preset.ip);
    setSimulatedCountry(preset.country);
    setSimulatedCity(preset.city);
    setSimulatedUserAgent(preset.userAgent);
    setSimulatedNetworkType(preset.networkType);
    setSimulatedAsnOrg(preset.asnOrg || '');
    setSimulatedTouchPoints(preset.touchPoints);
    setSimulatedGpuRenderer(preset.gpuRenderer);
    setSimulatedBatteryLevel(preset.batteryLevel);
    toast.success(`Preset applied: ${preset.name}`);
  };

  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLinkId) {
      toast.error('Please select a Smart Link to simulate');
      return;
    }

    try {
      setSimulating(true);
      const queryParams: Record<string, string> = {};
      if (simulatedQueryKey.trim() && simulatedQueryVal.trim()) {
        queryParams[simulatedQueryKey.trim()] = simulatedQueryVal.trim();
      }

      const res = await api.post('/api/v1/traffic-director/simulate', {
        linkId: selectedLinkId,
        simulatedIp,
        simulatedCountry,
        simulatedCity,
        simulatedUserAgent,
        simulatedReferrer,
        simulatedNetworkType,
        simulatedAsnOrg: simulatedAsnOrg || undefined,
        simulatedTouchPoints: Number(simulatedTouchPoints),
        simulatedGpuRenderer,
        simulatedBatteryLevel: Number(simulatedBatteryLevel),
        simulatedQueryParams: queryParams
      });

      setResult(res.data.data);
      toast.success('Simulation completed!');
    } catch (error: any) {
      console.error('Simulation error:', error);
      toast.error(error.response?.data?.error || 'Simulation failed');
    } finally {
      setSimulating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LogoLoader className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" /> Differential Testing
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Routing Simulator</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Simulate incoming traffic with custom IP, User-Agent, headers, and crawlers to inspect exact decision paths
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400 font-semibold mr-1">Presets:</span>
          {PRESETS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(p)}
              className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-purple-600 dark:hover:text-purple-400 text-gray-700 dark:text-gray-300 text-xs font-medium transition"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Form Left, Inspection Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Simulator Form */}
        <div className="lg:col-span-5 space-y-4">
          <form onSubmit={handleRunSimulation} className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              1. Simulation Context
            </h2>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Target Smart Link
              </label>
              {links.length > 0 ? (
                <CustomSelect
                  value={selectedLinkId}
                  onChange={(e: any) => setSelectedLinkId(e.target.value)}
                  options={links.map(l => ({ value: l.id, label: `${l.name} (/r/${l.slug})` }))}
                />
              ) : (
                <div className="p-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">No Smart Links configured yet.</p>
                  <Link
                    href="/traffic-director/links"
                    className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    + Create a Smart Link first
                  </Link>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Country (ISO)
                </label>
                <input
                  type="text"
                  value={simulatedCountry}
                  onChange={(e) => setSimulatedCountry(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white font-mono uppercase focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  placeholder="US"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={simulatedCity}
                  onChange={(e) => setSimulatedCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  placeholder="Los Angeles"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Client IP Address
              </label>
              <input
                type="text"
                value={simulatedIp}
                onChange={(e) => setSimulatedIp(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                User-Agent String
              </label>
              <textarea
                rows={3}
                value={simulatedUserAgent}
                onChange={(e) => setSimulatedUserAgent(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[11px] font-mono text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Referrer URL
              </label>
              <input
                type="text"
                value={simulatedReferrer}
                onChange={(e) => setSimulatedReferrer(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Query Param Key
                </label>
                <input
                  type="text"
                  value={simulatedQueryKey}
                  onChange={(e) => setSimulatedQueryKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white font-mono"
                  placeholder="utm_source"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Query Param Value
                </label>
                <input
                  type="text"
                  value={simulatedQueryVal}
                  onChange={(e) => setSimulatedQueryVal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white font-mono"
                  placeholder="google"
                />
              </div>
            </div>

            {/* Hardware & Network Emulation Controls */}
            <div className="p-3.5 rounded-xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 space-y-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Hardware & ASN Telemetry</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Network Type
                  </label>
                  <CustomSelect
                    value={simulatedNetworkType}
                    onChange={(e: any) => setSimulatedNetworkType(e.target.value)}
                    options={[
                      { value: 'residential', label: 'Residential ISP' },
                      { value: 'datacenter', label: 'Datacenter / Cloud' },
                      { value: 'cellular', label: 'Mobile 5G/4G' },
                      { value: 'vpn', label: 'VPN / Proxy' }
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Cloud ASN Provider
                  </label>
                  <CustomSelect
                    value={simulatedAsnOrg || ''}
                    onChange={(e: any) => setSimulatedAsnOrg(e.target.value)}
                    options={[
                      { value: '', label: 'None (Consumer ISP)' },
                      { value: 'AWS', label: 'Amazon AWS' },
                      { value: 'GOOGLE_CLOUD', label: 'Google Cloud' },
                      { value: 'AZURE', label: 'Microsoft Azure' },
                      { value: 'DIGITALOCEAN', label: 'DigitalOcean' },
                      { value: 'HETZNER', label: 'Hetzner Online' }
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Touch Points
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={simulatedTouchPoints}
                    onChange={(e) => setSimulatedTouchPoints(Number(e.target.value))}
                    className="w-full px-2 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-center text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Battery Level
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.01"
                    max="1.0"
                    value={simulatedBatteryLevel}
                    onChange={(e) => setSimulatedBatteryLevel(Number(e.target.value))}
                    className="w-full px-2 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-center text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-600 dark:text-gray-400 mb-1 truncate">
                    GPU Hardware
                  </label>
                  <CustomSelect
                    value={simulatedGpuRenderer.includes('SwiftShader') ? 'software' : 'hardware'}
                    onChange={(e: any) => setSimulatedGpuRenderer(e.target.value === 'software' ? 'Google SwiftShader (CPU Software Rasterizer)' : 'Apple GPU (A16 Bionic)')}
                    options={[
                      { value: 'hardware', label: 'Hardware GPU' },
                      { value: 'software', label: 'SwiftShader' }
                    ]}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={simulating}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white text-sm font-semibold shadow-lg shadow-purple-500/20 disabled:opacity-50 transition"
            >
              {simulating ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Run Differential Simulation
            </button>
          </form>
        </div>

        {/* Results & Inspection Drawer */}
        <div className="lg:col-span-7 space-y-4">
          {result ? (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Decision Outcome Card */}
              <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Decision Outcome
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                    Latency: {result.simulationResult?.evaluationLatencyMs || 1}ms
                  </span>
                </div>

                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Destination URL</div>
                  <a
                    href={result.simulationResult?.destinationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-base font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5 mt-1 break-all"
                  >
                    {result.simulationResult?.destinationUrl}
                    <ExternalLink className="w-4 h-4 shrink-0" />
                  </a>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs">
                  <div>
                    <span className="text-gray-400 block">Matched Path:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {result.simulationResult?.isFallback ? 'Fallback (Default)' : result.simulationResult?.matchedRuleName}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">HTTP Action:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold uppercase">
                      {result.simulationResult?.actionType}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Client Type:</span>
                    <span className="font-semibold capitalize text-purple-600 dark:text-purple-400">
                      {result.extractedSignals?.isBot ? `Bot (${result.extractedSignals.botName || 'Crawler'})` : `${result.extractedSignals?.deviceType} User`}
                    </span>
                  </div>
                </div>

                {/* Special Shields Flag Status */}
                {(result.simulationResult?.datacenterBlocked || result.simulationResult?.warmupBlocked || result.extractedSignals?.isEmulated) && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                    <Shield className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>
                      {result.simulationResult?.datacenterBlocked
                        ? '🛡️ Datacenter ASN Firewall dropped request to Fallback URL.'
                        : result.simulationResult?.warmupBlocked
                        ? '⏳ DSP Warmup Active: Traffic routed to compliant safe page.'
                        : '⚠️ Hardware Emulation Detected (SwiftShader/No Touch on mobile).'}
                    </span>
                  </div>
                )}
              </div>

              {/* Extracted Signals Summary */}
              <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm space-y-2">
                <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Extracted Request & Hardware Signals
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800">
                    <span className="text-gray-400 block">Country & City</span>
                    <span className="font-bold text-gray-900 dark:text-white">{result.extractedSignals?.country} · {result.extractedSignals?.city}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800">
                    <span className="text-gray-400 block">Network & ASN</span>
                    <span className="font-bold capitalize text-gray-900 dark:text-white">{result.extractedSignals?.networkType} {result.extractedSignals?.asnOrg ? `(${result.extractedSignals.asnOrg})` : ''}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800">
                    <span className="text-gray-400 block">Touch & Battery</span>
                    <span className="font-bold text-gray-900 dark:text-white">{result.extractedSignals?.touchPoints} pts · {Math.round((result.extractedSignals?.batteryLevel || 1) * 100)}%</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800">
                    <span className="text-gray-400 block">GPU & Emulation</span>
                    <span className="font-bold text-gray-900 dark:text-white">{result.extractedSignals?.isEmulated ? '⚠️ Emulated' : '✅ Hardware GPU'}</span>
                  </div>
                </div>
              </div>

              {/* Step-by-Step Rule Audit */}
              <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Rule Evaluation Sequence Audit
                </h3>

                <div className="space-y-3">
                  {result.ruleAudit?.map((audit: any, index: number) => (
                    <div
                      key={audit.ruleId}
                      className={`p-4 rounded-xl border transition ${
                        audit.isSelected
                          ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-sm'
                          : 'border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-400">#{index + 1}</span>
                          <span className="text-xs font-bold text-gray-900 dark:text-white">{audit.ruleName}</span>
                        </div>
                        {audit.isSelected ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" /> Selected Target
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                            <XCircle className="w-4 h-4 text-gray-300 dark:text-gray-600" /> Skipped
                          </span>
                        )}
                      </div>

                      {/* Condition Breakdown */}
                      {audit.conditions?.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {audit.conditions.map((c: any, cIdx: number) => (
                            <div key={cIdx} className="flex items-center gap-2 text-[11px] font-mono text-gray-600 dark:text-gray-400">
                              {c.matched ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <XCircle className="w-3 h-3 text-rose-500" />
                              )}
                              <span>
                                {c.condition.type} {c.condition.operator} &quot;{c.condition.value}&quot;
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Fallback Check */}
                  <div className={`p-4 rounded-xl border ${result.simulationResult?.isFallback ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20' : 'border-gray-100 dark:border-gray-800'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Default Fallback Rule</span>
                      {result.simulationResult?.isFallback && (
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Selected Target
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[360px] flex flex-col items-center justify-center p-8 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-center space-y-3">
              <Play className="w-10 h-10 text-purple-400 dark:text-purple-600" />
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Ready for Simulation</h3>
              <p className="text-xs text-gray-400 max-w-sm">
                Select a Smart Link, configure or pick a simulated client profile from the presets, and run the simulator to view real-time decision outputs.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TrafficSimulatorPage() {
  return (
    <Suspense fallback={
      <div className="flex h-96 items-center justify-center">
        <LogoLoader />
      </div>
    }>
      <TrafficSimulatorContent />
    </Suspense>
  );
}

