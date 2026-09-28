'use client';

import React from 'react';
import { PlatformModal, Button } from '@workspace/ui';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { ConnectedApp } from '../types';

interface RevokeAppModalProps {
  app: ConnectedApp | null;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export function RevokeAppModal({ app, onClose, onConfirm, loading = false }: RevokeAppModalProps) {
  if (!app) return null;

  return (
    <PlatformModal
      isOpen={Boolean(app)}
      onClose={onClose}
      title={`Revoke Access for ${app.name}`}
      maxWidthClass="max-w-md"
    >
      <div className="space-y-4 text-xs text-slate-600 pt-1">
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <p className="leading-relaxed">
            Revoking access will immediately terminate all active OAuth 2.0 sessions and tokens issued to <strong className="text-slate-900">{app.name}</strong>.
          </p>
        </div>

        <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Affected Permissions:</div>
          <div className="flex flex-wrap gap-1.5">
            {app.scopes.map((scope) => (
              <span key={scope} className="px-2 py-0.5 bg-white border border-slate-200 text-[10px] font-mono rounded text-slate-700">
                {scope}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button variant="ghost" onClick={onClose} disabled={loading} className="min-h-[40px] cursor-pointer">
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading} className="min-h-[40px] cursor-pointer">
            {loading ? 'Revoking Access...' : 'Confirm & Revoke Access'}
          </Button>
        </div>
      </div>
    </PlatformModal>
  );
}
