'use strict';
'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Copy,
  Check,
  ExternalLink,
  XCircle,
  RefreshCw,
  Terminal,
  HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

export interface OAuthErrorDetails {
  type?: 'REDIRECT_URI_MISMATCH' | 'ORIGIN_MISMATCH' | 'CLIENT_NOT_FOUND' | 'AUTH_DISABLED' | string;
  requestedUri?: string;
  requestedOrigin?: string;
  appName?: string;
  clientId?: string;
  registeredUris?: string[];
  allowedOrigins?: string[];
  hint?: string;
}

export interface OAuthErrorCardProps {
  error: string;
  errorDescription: string;
  details?: OAuthErrorDetails;
  onRetry?: () => void;
  onClose?: () => void;
}

export function OAuthErrorCard({
  error,
  errorDescription,
  details,
  onRetry,
  onClose,
}: OAuthErrorCardProps) {
  const [copied, setCopied] = useState(false);

  const isUriError = details?.type === 'REDIRECT_URI_MISMATCH' || errorDescription.toLowerCase().includes('redirect uri');
  const isOriginError = details?.type === 'ORIGIN_MISMATCH' || errorDescription.toLowerCase().includes('origin');

  const title = isUriError
    ? 'Redirect URI Not Whitelisted'
    : isOriginError
    ? 'Origin Not Authorized'
    : details?.type === 'CLIENT_NOT_FOUND'
    ? 'OAuth Client Not Found'
    : details?.type === 'AUTH_DISABLED'
    ? 'Authentication Disabled'
    : 'Configuration Error';

  const offendingValue = details?.requestedUri || details?.requestedOrigin || '';

  const handleCopyDetails = () => {
    const payload = JSON.stringify(
      {
        error,
        errorDescription,
        clientId: details?.clientId,
        requestedUri: details?.requestedUri,
        requestedOrigin: details?.requestedOrigin,
        registeredUris: details?.registeredUris,
        allowedOrigins: details?.allowedOrigins,
        timestamp: new Date().toISOString(),
      },
      null,
      2
    );

    if (navigator?.clipboard) {
      navigator.clipboard.writeText(payload);
      setCopied(true);
      toast.success('Error details copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
      return;
    }
    if (typeof window !== 'undefined') {
      const errorPayload = {
        type: '180_IDENTITY_ERROR',
        error,
        error_description: errorDescription,
        details,
      };
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(errorPayload, '*');
        window.close();
      } else if (window.parent && window.parent !== window) {
        window.parent.postMessage(errorPayload, '*');
        window.parent.postMessage({ type: '180_IDENTITY_CLOSE' }, '*');
      } else {
        window.history.back();
      }
    }
  };

  return (
    <div className="w-full space-y-4 animate-in fade-in zoom-in-95 duration-200 text-left">
      {/* ─── Header Alert Badge ─── */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-slate-900 shadow-sm relative overflow-hidden">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 text-amber-600">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700">
                OAuth Security Policy
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {error || 'invalid_request'}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 leading-snug">
              {title}
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {errorDescription}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Detailed Technical Diagnostics ─── */}
      <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 space-y-2.5 text-xs">
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
          <span className="font-bold text-slate-700 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-slate-500" />
            Diagnostics Summary
          </span>
          <button
            type="button"
            onClick={handleCopyDetails}
            className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-600" />
                <span className="text-emerald-600">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy Details</span>
              </>
            )}
          </button>
        </div>

        {details?.clientId ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Client ID</span>
            <code className="bg-white px-2 py-1 rounded border border-slate-200 font-mono text-[11px] text-slate-800 break-all select-all">
              {details.clientId}
            </code>
          </div>
        ) : null}

        {offendingValue ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider text-rose-500 font-semibold">
              {isUriError ? 'Unregistered Redirect URI' : 'Unwhitelisted Origin'}
            </span>
            <code className="bg-rose-50/80 border border-rose-200 px-2 py-1 rounded font-mono text-[11px] text-rose-700 break-all select-all font-semibold">
              {offendingValue}
            </code>
          </div>
        ) : null}

        {details?.registeredUris && details.registeredUris.length > 0 ? (
          <div className="flex flex-col gap-0.5 pt-1">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              Currently Allowed URIs ({details.registeredUris.length})
            </span>
            <div className="max-h-24 overflow-y-auto space-y-1 bg-white p-1.5 rounded border border-slate-200">
              {details.registeredUris.map((u, i) => (
                <div key={i} className="font-mono text-[10px] text-slate-600 truncate">
                  • {u}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* ─── Resolution Guide Callout ─── */}
      <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-100 flex items-start gap-2.5 text-xs text-blue-900">
        <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-blue-950">How to Fix This</p>
          <p className="text-blue-800/90 leading-relaxed text-[11px]">
            {details?.hint || (
              <>
                Add <code className="bg-white/80 px-1 py-0.5 rounded font-mono font-bold text-blue-900">{offendingValue || 'your URI'}</code> to your application&apos;s allowed redirect URIs or origins in the{' '}
                <a
                  href="http://localhost:3008"
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold underline hover:text-blue-950 inline-flex items-center gap-0.5"
                >
                  180 Developer Portal <ExternalLink className="w-2.5 h-2.5 inline" />
                </a>.
              </>
            )}
          </p>
        </div>
      </div>

      {/* ─── Action Controls ─── */}
      <div className="flex items-center gap-2 pt-1">
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="flex-1 py-2 px-3 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-800 active:scale-[0.99] transition-all cursor-pointer shadow-xs min-h-[38px]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-verify</span>
          </button>
        ) : null}

        <a
          href="http://localhost:3008"
          target="_blank"
          rel="noreferrer"
          className="flex-1 py-2 px-3 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-blue-700 active:scale-[0.99] transition-all cursor-pointer shadow-xs min-h-[38px]"
        >
          <span>Developer Console</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>

        <button
          type="button"
          onClick={handleClose}
          className="py-2 px-3 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-[0.99] font-bold text-xs transition-all cursor-pointer min-h-[38px]"
        >
          Close
        </button>
      </div>
    </div>
  );
}
