'use strict';
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Check,
  Eye,
  Save,
  Sparkles,
  Code2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@workspace/ui';
import { toast } from 'react-hot-toast';

interface PlanCard {
  planCode: string;
  name: string;
  description?: string;
  amount: number;
  currency?: string;
  interval?: string;
  isPopular?: boolean;
  features: string[];
  buttonText?: string;
}

interface PricingConfig {
  appId: string;
  headline: string;
  subheadline: string;
  theme: string;
  accentColor: string;
  billingIntervals: string[];
  yearlyDiscountPct: number;
  planCards: PlanCard[];
  customCss?: string;
}

interface PricingTablesTabProps {
  appId: string;
}

export function PricingTablesTab({ appId }: PricingTablesTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<PricingConfig>({
    appId,
    headline: 'Simple, transparent pricing',
    subheadline: 'Choose the plan that fits your growth',
    theme: 'auto',
    accentColor: '#6366f1',
    billingIntervals: ['MONTHLY', 'YEARLY'],
    yearlyDiscountPct: 20,
    planCards: [],
    customCss: '',
  });

  const [previewInterval, setPreviewInterval] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [copiedSnippet, setCopiedSnippet] = useState<'wc' | 'iframe' | null>(null);

  // Edit/Create Card Modal
  const [editingCardIndex, setEditingCardIndex] = useState<number | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardName, setCardName] = useState('');
  const [cardCode, setCardCode] = useState('');
  const [cardDescription, setCardDescription] = useState('');
  const [cardAmount, setCardAmount] = useState('499');
  const [cardCurrency, setCardCurrency] = useState('INR');
  const [cardPopular, setCardPopular] = useState(false);
  const [cardButtonText, setCardButtonText] = useState('Get Started');
  const [cardFeatures, setCardFeatures] = useState<string[]>(['Full Platform Access', 'Priority Support']);
  const [newFeatureText, setNewFeatureText] = useState('');

  const getApiBase = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4003';
  };

  const getPublicBase = () => {
    return process.env.NEXT_PUBLIC_PROFILE_URL || 'http://localhost:3009';
  };

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const apiBase = getApiBase();
      const token = localStorage.getItem('platform_auth_token');
      const res = await fetch(`${apiBase}/api/v1/pricing-tables/${appId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok && data.success && data.config) {
        setConfig({
          appId,
          headline: data.config.headline || 'Simple, transparent pricing',
          subheadline: data.config.subheadline || 'Choose the plan that fits your growth',
          theme: data.config.theme || 'auto',
          accentColor: data.config.accentColor || '#6366f1',
          billingIntervals: data.config.billingIntervals || ['MONTHLY', 'YEARLY'],
          yearlyDiscountPct: data.config.yearlyDiscountPct ?? 20,
          planCards: Array.isArray(data.config.planCards) ? data.config.planCards : [],
          customCss: data.config.customCss || '',
        });
      }
    } catch {
      toast.error('Failed to load pricing table settings');
    } finally {
      setLoading(false);
    }
  }, [appId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const apiBase = getApiBase();
      const token = localStorage.getItem('platform_auth_token');
      const res = await fetch(`${apiBase}/api/v1/pricing-tables/${appId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Pricing table configuration saved!');
      } else {
        toast.error(data.error || 'Failed to save configuration');
      }
    } catch {
      toast.error('Network error saving configuration');
    } finally {
      setSaving(false);
    }
  };

  const openCreateCardModal = () => {
    setEditingCardIndex(null);
    setCardName('');
    setCardCode('');
    setCardDescription('');
    setCardAmount('499');
    setCardCurrency('INR');
    setCardPopular(false);
    setCardButtonText('Get Started');
    setCardFeatures(['Unlimited Workspace Access', '24/7 Priority Support']);
    setShowCardModal(true);
  };

  const openEditCardModal = (index: number) => {
    const card = config.planCards[index];
    if (!card) return;
    setEditingCardIndex(index);
    setCardName(card.name);
    setCardCode(card.planCode);
    setCardDescription(card.description || '');
    setCardAmount(String(card.amount));
    setCardCurrency(card.currency || 'INR');
    setCardPopular(Boolean(card.isPopular));
    setCardButtonText(card.buttonText || 'Get Started');
    setCardFeatures([...(card.features || [])]);
    setShowCardModal(true);
  };

  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardName.trim()) {
      toast.error('Card title is required');
      return;
    }
    const amountVal = parseFloat(cardAmount);
    if (isNaN(amountVal) || amountVal < 0) {
      toast.error('Invalid amount');
      return;
    }

    const newCard: PlanCard = {
      planCode: cardCode.trim() || cardName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      name: cardName.trim(),
      description: cardDescription.trim(),
      amount: amountVal,
      currency: cardCurrency,
      isPopular: cardPopular,
      features: cardFeatures.filter((f) => f.trim().length > 0),
      buttonText: cardButtonText.trim() || 'Get Started',
    };

    const updated = [...config.planCards];
    if (editingCardIndex !== null && editingCardIndex >= 0) {
      updated[editingCardIndex] = newCard;
    } else {
      updated.push(newCard);
    }

    setConfig({ ...config, planCards: updated });
    setShowCardModal(false);
    toast.success(editingCardIndex !== null ? 'Plan updated' : 'Plan added');
  };

  const handleDeleteCard = (index: number) => {
    const updated = config.planCards.filter((_, i) => i !== index);
    setConfig({ ...config, planCards: updated });
    toast.success('Plan removed');
  };

  const handleAddFeature = () => {
    if (!newFeatureText.trim()) return;
    setCardFeatures([...cardFeatures, newFeatureText.trim()]);
    setNewFeatureText('');
  };

  const handleRemoveFeature = (idx: number) => {
    setCardFeatures(cardFeatures.filter((_, i) => i !== idx));
  };

  const copySnippet = (type: 'wc' | 'iframe') => {
    const publicBase = getPublicBase();
    let snippet = '';
    if (type === 'wc') {
      snippet = `<script src="${publicBase}/sdk/v1/180-core-sdk.js" async></script>\n<one-eighty-pricing-table app-id="${appId}" theme="${config.theme}" accent-color="${config.accentColor}"></one-eighty-pricing-table>`;
    } else {
      snippet = `<iframe src="${publicBase}/embed/pricing/${appId}" width="100%" height="650" frameborder="0" scrolling="no" style="border:none;border-radius:16px;"></iframe>`;
    }
    navigator.clipboard.writeText(snippet);
    setCopiedSnippet(type);
    toast.success('Snippet copied to clipboard');
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 p-8 flex items-center justify-center">
        <RefreshCw className="w-5 h-5 animate-spin text-purple-600" />
        <span className="text-xs text-zinc-500 ml-2">Loading pricing table...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview & Save Bar */}
      <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-white/10">
          <div>
            <h2 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Embeddable Pricing Table Builder</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Design zero-code responsive subscription tiers. Embed on your website via Web Component or iFrame.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={handleSaveConfig}
              disabled={saving}
              className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-purple-600/20"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Configuration</span>
            </Button>
          </div>
        </div>

        {/* Global Table Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Table Headline
            </label>
            <input
              type="text"
              value={config.headline}
              onChange={(e) => setConfig({ ...config, headline: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-xs text-zinc-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Subheadline
            </label>
            <input
              type="text"
              value={config.subheadline}
              onChange={(e) => setConfig({ ...config, subheadline: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-xs text-zinc-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Annual Billing Discount (%)
            </label>
            <input
              type="number"
              min={0}
              max={90}
              value={config.yearlyDiscountPct}
              onChange={(e) => setConfig({ ...config, yearlyDiscountPct: Number(e.target.value) })}
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-xs text-zinc-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Plan Cards Editor */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Subscription Tiers ({config.planCards.length})
            </h3>
            <Button
              type="button"
              onClick={openCreateCardModal}
              className="bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Plan Tier</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {config.planCards.map((card, idx) => (
              <div
                key={card.planCode || idx}
                className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/50 p-4 space-y-3 relative group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-zinc-950 dark:text-white flex items-center gap-1.5">
                      <span>{card.name}</span>
                      {card.isPopular && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-bold">
                          Popular
                        </span>
                      )}
                    </h4>
                    <span className="text-[11px] font-mono text-zinc-500">{card.planCode}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditCardModal(idx)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-purple-600 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCard(idx)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-red-500 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="text-lg font-black text-zinc-950 dark:text-white font-mono">
                  {card.currency === 'INR' ? '₹' : '$'}{card.amount}/mo
                </div>

                <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                  {(card.features || []).slice(0, 3).map((f, fIdx) => (
                    <li key={fIdx} className="flex items-center gap-1.5 truncate">
                      <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span className="truncate">{f}</span>
                    </li>
                  ))}
                  {card.features?.length > 3 && (
                    <li className="text-[11px] text-zinc-500 font-medium">
                      +{card.features.length - 3} more features
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* 1-Click Embed Snippets Bar */}
        <div className="pt-4 border-t border-zinc-200 dark:border-white/10 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-purple-600" />
            <span>Embed Snippets for External Websites</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-zinc-950 dark:text-white">Web Component Snippet</p>
                <p className="text-[11px] text-zinc-500">Fastest client-side embedding with native look</p>
              </div>
              <Button
                type="button"
                onClick={() => copySnippet('wc')}
                className="bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5"
              >
                {copiedSnippet === 'wc' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSnippet === 'wc' ? 'Copied' : 'Copy HTML'}</span>
              </Button>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-zinc-950 dark:text-white">Responsive IFrame Code</p>
                <p className="text-[11px] text-zinc-500">Zero-code iframe embed for WordPress, Webflow, Shopify</p>
              </div>
              <Button
                type="button"
                onClick={() => copySnippet('iframe')}
                className="bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5"
              >
                {copiedSnippet === 'iframe' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSnippet === 'iframe' ? 'Copied' : 'Copy IFrame'}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Edit or Create Card */}
      {showCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-white/10">
              <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                {editingCardIndex !== null ? 'Edit Subscription Tier' : 'Add Subscription Tier'}
              </h3>
              <button
                type="button"
                onClick={() => setShowCardModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCard} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Tier Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pro Sovereign"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-xs text-zinc-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Plan Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. pro_monthly"
                    value={cardCode}
                    onChange={(e) => setCardCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-xs font-mono text-zinc-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Short Description
                </label>
                <input
                  type="text"
                  placeholder="For scaling products and high volume users"
                  value={cardDescription}
                  onChange={(e) => setCardDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-xs text-zinc-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Monthly Price *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={cardAmount}
                    onChange={(e) => setCardAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-xs text-zinc-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Currency
                  </label>
                  <select
                    value={cardCurrency}
                    onChange={(e) => setCardCurrency(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-xs text-zinc-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Button Text
                  </label>
                  <input
                    type="text"
                    placeholder="Get Started"
                    value={cardButtonText}
                    onChange={(e) => setCardButtonText(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-xs text-zinc-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cardPopular}
                      onChange={(e) => setCardPopular(e.target.checked)}
                      className="rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Highlight as "Most Popular"
                    </span>
                  </label>
                </div>
              </div>

              {/* Feature Bullet Points */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  Feature Checklist (Bullet Points)
                </label>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Unlimited API Calls"
                    value={newFeatureText}
                    onChange={(e) => setNewFeatureText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddFeature();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-xs text-zinc-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <Button
                    type="button"
                    onClick={handleAddFeature}
                    className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs px-3 py-1.5 rounded-xl"
                  >
                    Add
                  </Button>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto pt-1">
                  {cardFeatures.map((feat, fIdx) => (
                    <div
                      key={fIdx}
                      className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/80 text-xs text-zinc-700 dark:text-zinc-300"
                    >
                      <span className="truncate flex-1 mr-2">{feat}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(fIdx)}
                        className="text-zinc-400 hover:text-red-500"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  onClick={() => setShowCardModal(false)}
                  className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs px-4 py-2 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-lg shadow-purple-600/20"
                >
                  Save Tier
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
