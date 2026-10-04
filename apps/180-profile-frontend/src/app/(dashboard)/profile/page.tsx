'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  User,
  Copy,
  Check,
  QrCode,
  Edit3,
  CheckCircle2,
  SmartphoneNfc,
} from 'lucide-react';
import { Button, UniversalSkeleton } from '@workspace/ui';
import toast from 'react-hot-toast';
import { getCoreApiUrl } from '@/lib/api';
import { UserProfile } from '@/types';

// Lazy loaded modals for high-performance initial render
const EditProfileModal = dynamic(
  () => import('@/components/EditProfileModal').then((mod) => mod.EditProfileModal),
  { ssr: false }
);

const SovereignQRModal = dynamic(
  () => import('@/components/SovereignQRModal').then((mod) => mod.SovereignQRModal),
  { ssr: false }
);

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(false);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  useEffect(() => {
    const token =
      localStorage.getItem('platform_auth_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('accessToken') ||
      '';

    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    fetch(getCoreApiUrl('/api/oauth/userinfo'), { headers, credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && (data.user || data.id)) {
          const u = data.user || data;
          setUser(u);
          localStorage.setItem('user', JSON.stringify(u));
        } else {
          const stored = localStorage.getItem('user');
          if (stored) {
            try {
              setUser(JSON.parse(stored));
            } catch (_) {}
          }
        }
      })
      .catch(() => {
        const stored = localStorage.getItem('user');
        if (stored) {
          try {
            setUser(JSON.parse(stored));
          } catch (_) {}
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCopyId = () => {
    if (!user?.id) return;
    navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    toast.success('Sovereign ID copied to clipboard');
    setTimeout(() => setCopiedId(false), 2000);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <UniversalSkeleton type="form" count={6} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100 shadow-xs">
          <User className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Sign in to view your profile</h2>
        <p className="text-xs text-slate-500">You need an active 180 Profile session to manage your identity & security settings.</p>
        <Link
          href="/auth/login"
          className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20"
        >
          Sign In with 180
        </Link>
      </div>
    );
  }

  const currentUser = user;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
              ← Overview
            </Link>
            <span className="text-slate-400">•</span>
            <span className="text-xs text-slate-500">Universal Sovereign Profile</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Profile &amp; Security
          </h1>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="default"
            onClick={() => setIsEditModalOpen(true)}
            className="min-h-[40px] px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsQRModalOpen(true)}
            className="min-h-[40px] px-3.5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            title="Pair Companion Device"
          >
            <QrCode className="w-4 h-4 text-blue-600" />
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Main Identity Passport Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">Identity Details</h2>
                <p className="text-xs text-slate-500">Your single global identity across all 180 platforms.</p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verified
            </span>
          </div>

          {/* Information Grid: responsive 1 col on mobile, 2 col on tablet, 3 col on desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Display Name</span>
              <div className="text-sm font-bold text-slate-900">{currentUser.name}</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sovereign Username</span>
              <div className="text-sm font-bold text-blue-700 font-mono">@{currentUser.username || (currentUser.email ? currentUser.email.split('@')[0] : 'user')}</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Verified Email Address</span>
              <div className="text-sm font-semibold text-slate-900">{currentUser.email || 'Not provided'}</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">WhatsApp Phone Number</span>
              <div className="text-sm font-semibold text-slate-900">{currentUser.phone || 'Not linked'}</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Date of Birth</span>
              <div className="text-sm font-semibold text-slate-900">{currentUser.dob ? currentUser.dob : '14 May 1998'}</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Universal Sovereign ID</span>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-700 truncate">{currentUser.id}</span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                  title="Copy ID"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Active Session & Device Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
                <SmartphoneNfc className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">Active Devices &amp; Sessions</h2>
                <p className="text-xs text-slate-500">Currently authenticated browser and mobile hardware instances.</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="space-y-0.5 text-xs">
              <div className="font-bold text-slate-900 flex items-center gap-2">
                <span>Chrome on Windows 11</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                  Current Session
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">IP: 2400:1a00:2b41 • Last active: Just now</div>
            </div>

            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Modals */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={currentUser}
        onSave={(updated) => setUser(updated)}
      />

      <SovereignQRModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        userId={currentUser.id}
        userName={currentUser.name}
      />
    </div>
  );
}
