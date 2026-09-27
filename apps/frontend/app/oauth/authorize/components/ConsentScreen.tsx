'use client';

import React from 'react';
import { ShieldCheck, User, Check, ArrowRight, LogOut, Lock } from 'lucide-react';

interface ScopeInfo {
  id: string;
  name: string;
  desc: string;
}

const SCOPE_DEFINITIONS: Record<string, ScopeInfo> = {
  openid: {
    id: 'openid',
    name: 'OpenID Connect Identity',
    desc: 'Verify your unique account identity across the ecosystem',
  },
  'identity:read': {
    id: 'identity:read',
    name: 'Basic 180 Profile',
    desc: 'Access your full name, @handle, headline, location, and avatar',
  },
  'identity:email': {
    id: 'identity:email',
    name: 'Email Address',
    desc: 'View your verified email address',
  },
  'identity:phone': {
    id: 'identity:phone',
    name: 'Phone Number',
    desc: 'View your verified phone number',
  },
  'pitch:read': {
    id: 'pitch:read',
    name: 'Pitch Network Activity',
    desc: 'View your pitch videos, upvotes, and public gigs',
  },
  'pitch:write': {
    id: 'pitch:write',
    name: 'Pitch Network Creation',
    desc: 'Publish pitch reels and post opportunities on your behalf',
  },
  'messages:send': {
    id: 'messages:send',
    name: 'Direct Messaging',
    desc: 'Send connection notes and chat messages in the 180 network',
  },
};

interface ConsentScreenProps {
  app: {
    name: string;
    description?: string;
    logoUrl?: string;
    isVerified?: boolean;
    homepageUrl?: string;
  };
  user: {
    name: string;
    username?: string;
    email: string;
    photoUrl?: string;
  };
  scopes: string[];
  isSubmitting: boolean;
  onApprove: () => void;
  onCancel: () => void;
  onSwitchAccount: () => void;
}

export const ConsentScreen: React.FC<ConsentScreenProps> = ({
  app,
  user,
  scopes,
  isSubmitting,
  onApprove,
  onCancel,
  onSwitchAccount,
}) => {
  return (
    <div className="w-full space-y-6">
      {/* App Header & Handshake */}
      <div className="flex flex-col items-center text-center space-y-3 pt-2">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 p-0.5 shadow-xl shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center overflow-hidden">
              {app.logoUrl ? (
                <img
                  src={app.logoUrl}
                  alt={app.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-black text-white">
                  {app.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>
          {app.isVerified && (
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 p-1 rounded-full shadow-lg" title="Verified Application">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center justify-center gap-1.5">
            {app.name}
            {app.isVerified && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Verified
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            {app.description || 'wants to connect with your 180 Profile'}
          </p>
        </div>
      </div>

      {/* Active User Card */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/90 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-950 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-semibold overflow-hidden">
            {user.photoUrl ? (
              <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold text-white flex items-center gap-1">
              {user.name}
              {user.username && (
                <span className="text-xs text-indigo-400 font-normal">
                  @{user.username}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 truncate max-w-[180px]">
              {user.email}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onSwitchAccount}
          title="Switch Account"
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-800/80 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Switch</span>
        </button>
      </div>

      {/* Permissions List */}
      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
          Permissions Requested
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {scopes.map((scope) => {
            const def = SCOPE_DEFINITIONS[scope] || {
              id: scope,
              name: scope,
              desc: `Access ${scope} capabilities`,
            };
            return (
              <div
                key={scope}
                className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80"
              >
                <div className="mt-0.5 text-indigo-400 bg-indigo-500/10 p-1 rounded-md">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-semibold text-slate-200">
                    {def.name}
                  </div>
                  <div className="text-[11px] text-slate-400 leading-snug">
                    {def.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2.5 pt-2">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onApprove}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? (
            'Authorizing...'
          ) : (
            <>
              <span>Authorize & Continue</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={onCancel}
          className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 font-medium text-xs transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>

      {/* Footer Trust Shield */}
      <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 pt-1">
        <Lock className="w-3 h-3 text-slate-500" />
        <span>End-to-End Cryptographic Handshake by 180 Identity</span>
      </div>
    </div>
  );
};
