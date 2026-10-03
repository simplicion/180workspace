'use strict';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Percent,
  DollarSign,
  TrendingDown,
  RefreshCw,
  Sparkles,
  HelpCircle,
  Sliders,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@workspace/ui';
import { toast } from 'react-hot-toast';

interface GeoRuleItem {
  id: string;
  appId: string;
  countryCode: string;
  discountPercent?: number | null;
  fixedAmount?: number | null;
  customCurrency?: string | null;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CountryInfo {
  code: string;
  name: string;
  currency: string;
  tier: number;
  defaultDiscountPercent: number;
}

interface LocalizedPricingResult {
  country: string;
  currency: string;
  originalAmount: number;
  discountPercent: number;
  finalAmount: number;
  formattedAmount: string;
  pppApplied: boolean;
  isOverride: boolean;
}

interface GeoPricingTabProps {
  appId: string;
}

export function GeoPricingTab({ appId }: GeoPricingTabProps) {
  const [rules, setRules] = useState<GeoRuleItem[]>([]);
  const [directory, setDirectory] = useState<CountryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [pppEnabled, setPppEnabled] = useState(true);
  const [togglingPPP, setTogglingPPP] = useState(false);

  // Simulator State
  const [simBaseAmount, setSimBaseAmount] = useState('49.00');
  const [simBaseCurrency, setSimBaseCurrency] = useState('USD');
  const [simCountry, setSimCountry] = useState('IN');
  const [simResult, setSimResult] = useState<LocalizedPricingResult | null>(null);
  const [simulating, setSimulating] = useState(false);

  // Create Override Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [savingRule, setSavingRule] = useState(false);
  const [ruleCountry, setRuleCountry] = useState('IN');
  const [ruleType, setRuleType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [ruleDiscountPercent, setRuleDiscountPercent] = useState('50');
  const [ruleFixedAmount, setRuleFixedAmount] = useState('1499');
  const [ruleCurrency, setRuleCurrency] = useState('INR');

  const getApiBase = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4003';
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('platform_auth_token');
      const apiBase = getApiBase();

      const [rulesRes, dirRes] = await Promise.all([
        fetch(`${apiBase}/api/v1/geo-pricing/apps/${appId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiBase}/api/v1/geo-pricing/directory`),
      ]);

      const rulesData = await rulesRes.json();
      const dirData = await dirRes.json();

      if (rulesRes.ok && rulesData.success) {
        setRules(rulesData.rules || rulesData.data || []);
      }
      if (dirRes.ok && dirData.success) {
        setDirectory(dirData.directory || []);
      }
    } catch (err: any) {
      toast.error('Failed to load geo-pricing configuration');
    } finally {
      setLoading(false);
    }
  }, [appId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Run simulation whenever simulator inputs change
  const runSimulation = useCallback(async () => {
    const amount = parseFloat(simBaseAmount);
    if (isNaN(amount) || amount <= 0) return;

    setSimulating(true);
    try {
      const apiBase = getApiBase();
      const res = await fetch(
        `${apiBase}/api/v1/geo-pricing/resolve?appId=${appId}&baseAmount=${amount}&baseCurrency=${simBaseCurrency}&country=${simCountry}`
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setSimResult(data.pricing || data.data);
      }
    } catch {
      // fallback simulation calculation
      const countryObj = directory.find((c) => c.code === simCountry);
      const disc = countryObj ? countryObj.defaultDiscountPercent : 0;
      const finalVal = amount * (1 - disc / 100);
      setSimResult({
        country: simCountry,
        currency: countryObj?.currency || 'USD',
        originalAmount: amount,
        discountPercent: disc,
        finalAmount: finalVal,
        formattedAmount: `${countryObj?.currency || '$'} ${finalVal.toFixed(2)}`,
        pppApplied: disc > 0,
        isOverride: false,
      });
    } finally {
      setSimulating(false);
    }
  }, [appId, simBaseAmount, simBaseCurrency, simCountry, directory]);

  useEffect(() => {
    runSimulation();
  }, [runSimulation]);

  const handleTogglePPP = async () => {
    setTogglingPPP(true);
    try {
      const token = localStorage.getItem('platform_auth_token');
      const apiBase = getApiBase();
      const newStatus = !pppEnabled;

      const res = await fetch(`${apiBase}/api/v1/geo-pricing/apps/${appId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled: newStatus }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPppEnabled(newStatus);
        toast.success(`Automated PPP pricing ${newStatus ? 'enabled' : 'disabled'}`);
        runSimulation();
      } else {
        toast.error(data.error || 'Failed to toggle PPP pricing');
      }
    } catch {
      toast.error('Network error while toggling PPP');
    } finally {
      setTogglingPPP(false);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRule(true);
    try {
      const token = localStorage.getItem('platform_auth_token');
      const apiBase = getApiBase();

      const payload: any = {
        countryCode: ruleCountry.toUpperCase(),
        customCurrency: ruleCurrency.toUpperCase(),
        isEnabled: true,
      };

      if (ruleType === 'PERCENT') {
        payload.discountPercent = parseFloat(ruleDiscountPercent);
      } else {
        payload.fixedAmount = parseFloat(ruleFixedAmount);
      }

      const res = await fetch(`${apiBase}/api/v1/geo-pricing/apps/${appId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Rule for ${ruleCountry} saved`);
        setShowCreateModal(false);
        fetchData();
        runSimulation();
      } else {
        toast.error(data.error || 'Failed to save country rule');
      }
    } catch {
      toast.error('Failed to create country rule');
    } finally {
      setSavingRule(false);
    }
  };

  const handleDeleteRule = async (ruleId: string, countryCode: string) => {
    if (!confirm(`Are you sure you want to delete the override for ${countryCode}?`)) return;
    try {
      const token = localStorage.getItem('platform_auth_token');
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/api/v1/geo-pricing/apps/${appId}/${ruleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Override for ${countryCode} deleted`);
        setRules((prev) => prev.filter((r) => r.id !== ruleId));
        runSimulation();
      } else {
        toast.error(data.error || 'Failed to delete rule');
      }
    } catch {
      toast.error('Network error deleting rule');
    }
  };

  const getCountryName = (code: string) => {
    const found = directory.find((c) => c.code === code);
    return found ? `${found.name} (${code})` : code;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Automated PPP Toggle */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950/40 via-purple-900/20 to-zinc-950 p-6 border border-indigo-500/20 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
                <Globe className="h-4 w-4" />
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">Dynamic Geo-Pricing & PPP Engine</h2>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                Cloudflare Edge Detected
              </span>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Automatically calculate Purchasing Power Parity (PPP) discounts based on the visitor&apos;s country header (
              <code className="text-xs bg-zinc-800 px-1.5 py-0.5 rounded text-indigo-300">CF-IPCountry</code>). Increase
              international revenue by making checkout affordable in developing economies while maintaining full price in high-income markets.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-zinc-900/80 p-4 rounded-xl border border-zinc-800">
            <div>
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Automated World Bank PPP</div>
              <div className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
                {pppEnabled ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span className="text-emerald-400">Active (4 World Tiers)</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-zinc-500" />
                    <span className="text-zinc-400">Disabled (Global Flat USD)</span>
                  </>
                )}
              </div>
            </div>
            <Button
              onClick={handleTogglePPP}
              disabled={togglingPPP}
              variant={pppEnabled ? 'outline' : 'default'}
              size="sm"
              className={
                pppEnabled
                  ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-200'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }
            >
              {togglingPPP ? 'Updating...' : pppEnabled ? 'Disable PPP' : 'Enable Automated PPP'}
            </Button>
          </div>
        </div>
      </div>

      {/* Live Regional Simulator */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-xl shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4 mb-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
              <Sliders className="h-4 w-4" />
            </span>
            <div>
              <h3 className="font-semibold text-white">Live Regional Price Simulator</h3>
              <p className="text-xs text-zinc-400">Preview exactly how prices appear to customers worldwide</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={runSimulation}
              disabled={simulating}
              className="text-xs border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${simulating ? 'animate-spin' : ''}`} />
              Recalculate
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Base Configuration Input */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-1.5">Base Product Price</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="number"
                  step="0.01"
                  value={simBaseAmount}
                  onChange={(e) => setSimBaseAmount(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                  placeholder="49.00"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-1.5">Base Currency</label>
              <select
                value={simBaseCurrency}
                onChange={(e) => setSimBaseCurrency(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-1.5">Simulate Visitor Location</label>
              <select
                value={simCountry}
                onChange={(e) => setSimCountry(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {directory.length > 0 ? (
                  directory.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.code}) - Tier {c.tier} ({c.defaultDiscountPercent}% off)
                    </option>
                  ))
                ) : (
                  <>
                    <option value="US">United States (US) - 0%</option>
                    <option value="GB">United Kingdom (GB) - 0%</option>
                    <option value="IN">India (IN) - 60%</option>
                    <option value="BR">Brazil (BR) - 50%</option>
                    <option value="NG">Nigeria (NG) - 60%</option>
                    <option value="JP">Japan (JP) - 0%</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Arrow / Transition Divider */}
          <div className="flex md:flex-col items-center justify-center text-zinc-600 gap-2">
            <div className="hidden md:block w-px h-12 bg-zinc-800" />
            <ArrowRight className="h-6 w-6 text-indigo-400" />
            <div className="hidden md:block w-px h-12 bg-zinc-800" />
          </div>

          {/* Calculated Output Card */}
          <div className="rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/20 via-zinc-950 to-zinc-950 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Localized Customer Price</span>
                {simResult?.isOverride ? (
                  <span className="text-[11px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                    Custom Override
                  </span>
                ) : simResult?.pppApplied ? (
                  <span className="text-[11px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    PPP Applied
                  </span>
                ) : (
                  <span className="text-[11px] font-medium bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
                    Standard Rate
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <div className="text-3xl font-extrabold text-white tracking-tight">
                  {simResult ? simResult.formattedAmount : '...'}
                </div>
                {simResult && simResult.discountPercent > 0 && (
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <span className="line-through text-zinc-500">${simBaseAmount}</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                      <TrendingDown className="h-3 w-3" />
                      {simResult.discountPercent}% purchasing power discount
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-800/80 text-xs text-zinc-400 space-y-1.5">
              <div className="flex justify-between">
                <span>Target Market:</span>
                <span className="text-zinc-200 font-medium">{getCountryName(simCountry)}</span>
              </div>
              <div className="flex justify-between">
                <span>Currency Settlement:</span>
                <span className="text-zinc-200 font-medium">{simResult?.currency || 'USD'}</span>
              </div>
              <div className="flex justify-between">
                <span>Psychological Rounding:</span>
                <span className="text-emerald-400 font-medium">Automatic (.99 / .00 local standard)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* World Bank PPP Tiers Overview */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-xl">
        <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
          <span>World Bank PPP Discount Benchmark</span>
          <span className="text-xs text-zinc-500 font-normal">Updated Quarterly</span>
        </h3>
        <p className="text-xs text-zinc-400 mb-4">
          Automated pricing automatically maps international users to one of 4 purchasing power tiers:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60">
            <div className="text-xs font-semibold text-zinc-400 uppercase">Tier 1: High Income</div>
            <div className="text-2xl font-bold text-white mt-1">0% Off</div>
            <p className="text-xs text-zinc-500 mt-2">United States, United Kingdom, Canada, Australia, Germany, Japan, Singapore</p>
          </div>

          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60">
            <div className="text-xs font-semibold text-indigo-400 uppercase">Tier 2: Upper Middle</div>
            <div className="text-2xl font-bold text-indigo-300 mt-1">30% Off</div>
            <p className="text-xs text-zinc-500 mt-2">Poland, Chile, Malaysia, Hungary, Romania, Croatia</p>
          </div>

          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60">
            <div className="text-xs font-semibold text-purple-400 uppercase">Tier 3: Middle Income</div>
            <div className="text-2xl font-bold text-purple-300 mt-1">50% Off</div>
            <p className="text-xs text-zinc-500 mt-2">Brazil, Mexico, Turkey, South Africa, Colombia, Argentina</p>
          </div>

          <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/10">
            <div className="text-xs font-semibold text-emerald-400 uppercase">Tier 4: Growth Markets</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">60% Off</div>
            <p className="text-xs text-zinc-400 mt-2">India, Indonesia, Philippines, Nigeria, Kenya, Vietnam, Pakistan</p>
          </div>
        </div>
      </div>

      {/* Custom Country Overrides Section */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="font-semibold text-white">Custom Country Overrides</h3>
            <p className="text-xs text-zinc-400">
              Need specific pricing for a key partner or country? Define custom fixed rates or percentage discounts that override default PPP.
            </p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 text-xs"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Country Override
          </Button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-zinc-500 text-sm">Loading custom overrides...</div>
        ) : rules.length === 0 ? (
          <div className="py-12 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40">
            <Globe className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
            <h4 className="text-sm font-medium text-zinc-300">No Custom Overrides Defined</h4>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
              Your app is currently running 100% on automated World Bank PPP tiers. Add custom overrides if you need fixed pricing in specific countries.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-800 text-xs uppercase text-zinc-400 bg-zinc-950/60">
                <tr>
                  <th className="py-3 px-4">Country</th>
                  <th className="py-3 px-4">Rule Type</th>
                  <th className="py-3 px-4">Override Value</th>
                  <th className="py-3 px-4">Currency</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="py-3 px-4 font-medium text-white flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded bg-zinc-800 text-xs font-mono font-bold text-zinc-300">
                        {rule.countryCode}
                      </span>
                      <span>{getCountryName(rule.countryCode)}</span>
                    </td>
                    <td className="py-3 px-4 text-zinc-300">
                      {rule.discountPercent != null ? 'Percentage Discount' : 'Fixed Price Override'}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-emerald-400">
                      {rule.discountPercent != null
                        ? `${rule.discountPercent}% OFF`
                        : `${rule.customCurrency || '$'} ${rule.fixedAmount}`}
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-400">{rule.customCurrency || 'USD'}</td>
                    <td className="py-3 px-4">
                      {rule.isEnabled ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                          <XCircle className="h-3 w-3" />
                          Disabled
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRule(rule.id, rule.countryCode)}
                        className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Country Override Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Globe className="h-4 w-4 text-indigo-400" />
                Add Country Override
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-zinc-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-1">Target Country</label>
                <select
                  value={ruleCountry}
                  onChange={(e) => {
                    const code = e.target.value;
                    setRuleCountry(code);
                    const found = directory.find((c) => c.code === code);
                    if (found) setRuleCurrency(found.currency);
                  }}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  {directory.length > 0 ? (
                    directory.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name} ({c.code}) - {c.currency}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="IN">India (IN)</option>
                      <option value="BR">Brazil (BR)</option>
                      <option value="NG">Nigeria (NG)</option>
                      <option value="TR">Turkey (TR)</option>
                      <option value="ID">Indonesia (ID)</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-1">Rule Model</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRuleType('PERCENT')}
                    className={`py-2 px-3 text-xs font-medium rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                      ruleType === 'PERCENT'
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Percent className="h-3.5 w-3.5" />
                    Percentage Off
                  </button>
                  <button
                    type="button"
                    onClick={() => setRuleType('FIXED')}
                    className={`py-2 px-3 text-xs font-medium rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                      ruleType === 'FIXED'
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <DollarSign className="h-3.5 w-3.5" />
                    Fixed Amount
                  </button>
                </div>
              </div>

              {ruleType === 'PERCENT' ? (
                <div>
                  <label className="text-xs font-medium text-zinc-400 block mb-1">Discount Percentage (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={ruleDiscountPercent}
                    onChange={(e) => setRuleDiscountPercent(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. 50"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-zinc-400 block mb-1">Fixed Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      value={ruleFixedAmount}
                      onChange={(e) => setRuleFixedAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                      placeholder="1499"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-400 block mb-1">Currency</label>
                    <input
                      type="text"
                      value={ruleCurrency}
                      onChange={(e) => setRuleCurrency(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white uppercase focus:outline-none focus:border-indigo-500 font-mono"
                      placeholder="INR"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                  className="border-zinc-800 text-zinc-400"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={savingRule}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  {savingRule ? 'Saving...' : 'Save Override'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
