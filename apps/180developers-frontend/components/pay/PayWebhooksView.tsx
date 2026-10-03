'use client';

import React from 'react';
import {
  Webhook,
  Send,
  RotateCw,
  Loader2,
  Terminal,
  ShieldAlert,
  Save,
} from 'lucide-react';
import { useProject } from '@/context/ProjectContext';

export function PayWebhooksView() {
  const {
    webhookUrl,
    setWebhookUrl,
    webhookSecret,
    testResult,
    isTestingWebhook,
    handleTestWebhook,
    handleRotateWebhookSecret,
    saveSettings,
    saving,
  } = useProject();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSettings({ webhookUrl: webhookUrl.trim() });
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-200 dark:border-white/10">
          <div>
            <h2 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
              <Webhook className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Webhook & 2-Way Payment Verification Engine</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Real-time payment event notifications signed with HMAC SHA-256 for instant order fulfillment.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save Webhook URL</span>
          </button>
        </div>

        {/* Informative Banner */}
        <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 text-xs text-purple-950 dark:text-purple-200 space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            <span>2-Way Cryptographic Verification</span>
          </p>
          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
            180 Pay signs every outgoing webhook with <code className="font-mono text-purple-600 dark:text-purple-400">X-180-Signature</code> using your signing secret. Verify this signature before fulfilling orders or crediting wallets.
          </p>
        </div>

        {/* Webhook Endpoint Input & Test Button */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Payment Webhook Destination URL
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              placeholder="https://yourdomain.com/api/webhooks/180pay"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-purple-500 transition-colors"
            />
            <button
              type="button"
              onClick={handleTestWebhook}
              disabled={isTestingWebhook || !webhookUrl.trim()}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shrink-0"
            >
              {isTestingWebhook ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Testing...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Test Ping</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Webhook Signing Secret */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Webhook Signing Secret
          </label>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 font-mono text-xs text-zinc-500 dark:text-zinc-400">
            <span className="flex-1">
              {webhookSecret ? `whsec_••••••••••••${webhookSecret.slice(-6)}` : 'Secret configured automatically'}
            </span>
            <button
              type="button"
              onClick={handleRotateWebhookSecret}
              className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <RotateCw className="w-3 h-3" />
              <span>Rotate</span>
            </button>
          </div>
        </div>

        {/* Test Result Console */}
        {testResult && (
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2.5 font-mono text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-zinc-400" />
                <span className="text-zinc-300 font-bold">Webhook Delivery Telemetry</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    testResult.success
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  HTTP {testResult.statusCode}
                </span>
                <span className="text-zinc-500 text-[10px]">{testResult.latencyMs}ms</span>
              </div>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="text-zinc-400">
                <span className="text-zinc-500">Destination:</span> {testResult.targetUrl}
              </div>
              {testResult.signature && (
                <div className="text-zinc-400 truncate">
                  <span className="text-zinc-500">X-180-Signature:</span> {testResult.signature}
                </div>
              )}
              <div className="text-zinc-400">
                <span className="text-zinc-500">Status Message:</span> {testResult.message}
              </div>
              {testResult.response && (
                <div className="pt-1.5">
                  <span className="text-zinc-500 block mb-1">Server Response:</span>
                  <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 overflow-x-auto text-[10px] max-h-24 select-all">
                    {testResult.response}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </form>
  );
}

export default PayWebhooksView;
