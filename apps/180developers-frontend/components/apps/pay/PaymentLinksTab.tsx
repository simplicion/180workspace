'use strict';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Link as LinkIcon,
  Plus,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Package,
  Layers,
  FileText,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import { Button } from '@workspace/ui';
import { toast } from 'react-hot-toast';

interface PaymentLinkItem {
  id: string;
  appId: string;
  slug: string;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  purchasesCount: number;
  maxPurchases?: number | null;
  isActive: boolean;
  redirectUrl?: string;
  fulfillmentMessage?: string;
  fulfillmentFileUrl?: string;
  createdAt: string;
}

interface PaymentLinksTabProps {
  appId: string;
}

export function PaymentLinksTab({ appId }: PaymentLinksTabProps) {
  const [links, setLinks] = useState<PaymentLinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('499');
  const [currency, setCurrency] = useState('INR');
  const [customSlug, setCustomSlug] = useState('');
  const [maxPurchases, setMaxPurchases] = useState('');
  const [fulfillmentMessage, setFulfillmentMessage] = useState('');
  const [fulfillmentFileUrl, setFulfillmentFileUrl] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');

  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const getApiBase = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4003';
  };

  const getPublicBase = () => {
    return process.env.NEXT_PUBLIC_PROFILE_URL || 'http://localhost:3009';
  };

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('platform_auth_token');
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/api/v1/payment-links/apps/${appId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLinks(data.links || data.data || []);
      }
    } catch {
      toast.error('Failed to load payment links');
    } finally {
      setLoading(false);
    }
  }, [appId]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      toast.error('Amount must be greater than zero');
      return;
    }

    setCreating(true);
    try {
      const token = localStorage.getItem('platform_auth_token');
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/api/v1/payment-links/apps/${appId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          amount: val,
          currency: currency.toUpperCase(),
          customSlug: customSlug.trim() || undefined,
          maxPurchases: maxPurchases ? parseInt(maxPurchases, 10) : null,
          fulfillmentMessage: fulfillmentMessage.trim() || undefined,
          fulfillmentFileUrl: fulfillmentFileUrl.trim() || undefined,
          redirectUrl: redirectUrl.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create payment link');
      }

      toast.success('Payment Link generated successfully!');
      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setCustomSlug('');
      fetchLinks();
    } catch (err: any) {
      toast.error(err.message || 'Error creating payment link');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteLink = async (id: string, slugName: string) => {
    if (!confirm(`Are you sure you want to delete payment link /${slugName}?`)) return;

    try {
      const token = localStorage.getItem('platform_auth_token');
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/api/v1/payment-links/apps/${appId}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete payment link');
      toast.success('Payment link deleted');
      fetchLinks();
    } catch (err: any) {
      toast.error(err.message || 'Error deleting payment link');
    }
  };

  const copyLinkUrl = (slug: string) => {
    const fullUrl = `${getPublicBase()}/link/${slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedSlug(slug);
    toast.success('Payment link copied to clipboard!');
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const filteredLinks = links.filter((l) =>
    l.title.toLowerCase().includes(search.toLowerCase()) ||
    l.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 shadow-sm dark:shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <LinkIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-950 dark:text-white">Shareable Payment Links</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Zero-code hosted checkout links with capacity caps & instant digital fulfillment.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchLinks}
            className="rounded-xl border-zinc-200 dark:border-white/10"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create Payment Link</span>
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          placeholder="Filter payment links..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 text-sm text-zinc-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Links Grid */}
      {loading ? (
        <div className="p-12 text-center text-sm text-zinc-500">Loading payment links...</div>
      ) : filteredLinks.length === 0 ? (
        <div className="p-12 text-center space-y-3 rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950">
          <Package className="w-10 h-10 text-zinc-400 mx-auto" />
          <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">No payment links created yet</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Generate shareable payment links to sell digital products, tickets, or services with zero backend coding.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredLinks.map((link) => {
            const isSoldOut = link.maxPurchases && link.purchasesCount >= link.maxPurchases;

            return (
              <div
                key={link.id}
                className="p-5 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 space-y-4 hover:border-zinc-300 dark:hover:border-white/20 transition-colors shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-950 dark:text-white">{link.title}</h3>
                    <p className="text-xs text-zinc-500 font-mono mt-0.5">/link/{link.slug}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-zinc-950 dark:text-white">
                      {link.currency === 'INR' ? '₹' : '$'}{link.amount}
                    </span>
                  </div>
                </div>

                {link.description && (
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2">{link.description}</p>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-white/5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">Sales:</span>
                    <span className="font-semibold text-zinc-950 dark:text-white">
                      {link.purchasesCount} / {link.maxPurchases ? link.maxPurchases : '∞'}
                    </span>
                    {isSoldOut && (
                      <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[10px] font-bold">
                        SOLD OUT
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => copyLinkUrl(link.slug)}
                      className="p-2 rounded-xl text-zinc-500 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                      title="Copy Public Link"
                    >
                      {copiedSlug === link.slug ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <a
                      href={`${getPublicBase()}/link/${link.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                      title="Open Checkout Preview"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDeleteLink(link.id, link.slug)}
                      className="p-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete Link"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 p-6 sm:p-8 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-zinc-950 dark:text-white">Create Shareable Payment Link</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateLink} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Item Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Masterclass VIP Ticket"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-sm text-zinc-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional brief description of what customer receives..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-sm text-zinc-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Price Amount
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-sm text-zinc-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-sm text-zinc-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Custom Slug (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. masterclass-pass"
                    value={customSlug}
                    onChange={(e) => setCustomSlug(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-sm font-mono text-zinc-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Capacity Cap (Inventory)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 50 (Leave blank for unlimited)"
                    value={maxPurchases}
                    onChange={(e) => setMaxPurchases(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-sm text-zinc-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Digital Fulfillment Assets */}
              <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-3">
                <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" />
                  Instant Digital Delivery (Revealed Only After Payment)
                </span>
                <div>
                  <input
                    type="text"
                    placeholder="License Key, Discord Invite, or Secret Access Message..."
                    value={fulfillmentMessage}
                    onChange={(e) => setFulfillmentMessage(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-xs text-zinc-950 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <input
                    type="url"
                    placeholder="Digital Asset Download URL (e.g. https://cdn.../file.zip)"
                    value={fulfillmentFileUrl}
                    onChange={(e) => setFulfillmentFileUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-xs text-zinc-950 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-white/10">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button type="submit" disabled={creating} className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold">
                  {creating ? 'Generating...' : 'Create Payment Link'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
