'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { DesktopSidebar } from '@/components/DesktopSidebar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { UserProfile } from '@/types';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [balance, setBalance] = useState<number | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchProfileAndWallet = async () => {
      const token =
        localStorage.getItem('platform_auth_token') ||
        localStorage.getItem('token') ||
        localStorage.getItem('accessToken');

      if (!token) {
        setUser(null);
        setBalance(null);
        return;
      }

      // 1. Fetch User Profile
      try {
        const res = await fetch('/api/oauth/userinfo', {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data && (data.user || data.id)) {
            const validUser = data.user || data;
            setUser(validUser);
            localStorage.setItem('user', JSON.stringify(validUser));
          } else {
            setUser(null);
          }
        } else {
          localStorage.removeItem('platform_auth_token');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      } catch (_) {
        setUser(null);
      }

      // 2. Fetch Wallet Balance
      try {
        const res = await fetch('/api/oauth/wallet', {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data && data.data && typeof data.data.balance === 'number') {
            setBalance(data.data.balance);
          } else {
            setBalance(0.0);
          }
        } else {
          setBalance(0.0);
        }
      } catch (_) {
        setBalance(0.0);
      }
    };

    fetchProfileAndWallet();
  }, [router]);

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-slate-900 selection:bg-blue-500/20 selection:text-blue-950 font-sans relative">
      {/* Background Soft Dot-Matrix Pattern */}
      <div className="fixed inset-0 marketing-grid-bg pointer-events-none z-0 opacity-80" />

      {/* Desktop Side Menu (lg:flex) */}
      {user && <DesktopSidebar user={user} balance={balance} />}

      {/* Content Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Navigation */}
        <Header balance={balance} user={user} />

        {/* Main Content Viewport with pb-28 on mobile so bottom nav never overlaps */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-28 lg:pb-8 relative z-10">
          {children}
        </main>

        {/* Unified Platform Footer */}
        <Footer />
      </div>

      {/* Mobile Bottom Navigation Bar (< lg:) */}
      {user && <MobileBottomNav user={user} balance={balance} />}
    </div>
  );
}
