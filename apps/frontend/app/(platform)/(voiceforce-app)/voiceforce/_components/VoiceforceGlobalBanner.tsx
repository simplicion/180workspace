"use client";

import { useState, useEffect } from 'react';
import { Lock, AlertTriangle, AlertCircle, CreditCard, Sparkles } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { locationService } from '@/lib/location-service';
import { WalletLedgerDrawer } from './WalletLedgerDrawer';
import { LiveScreenPopModal, ScreenPopData } from './LiveScreenPopModal';
import clsx from 'clsx';

export function VoiceforceGlobalBanner() {
  const { company } = useAuth();
  const [wallet, setWallet] = useState<{
    balanceInr: number;
    isLocked: boolean;
    isLow: boolean;
    minRequiredInr: number;
    recommendedInr: number;
  } | null>(null);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [screenPopData, setScreenPopData] = useState<ScreenPopData | null>(null);
  const [isScreenPopOpen, setIsScreenPopOpen] = useState(false);

  const fetchWallet = async () => {
    try {
      const res = await api.get('/api/v1/wallet');
      if (res.data?.data) {
        setWallet(res.data.data);
      }
    } catch {
      // Graceful fallback
    }
  };

  useEffect(() => {
    fetchWallet();
    const interval = setInterval(fetchWallet, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, []);

  if (!wallet) return null;

  const { balanceInr = 0, isLocked = false, isLow = false } = wallet;
  const currencyCode = ((wallet as any)?.currency || company?.currency || 'USD').toUpperCase();
  const currencySymbol = (wallet as any)?.currencySymbol || company?.currencySymbol || locationService.getCurrencySymbol(currencyCode);
  const isUsd = currencyCode === 'USD';
  const recommendedAmount = Number(wallet.recommendedInr || (isUsd ? 50 : 1000));
  const minRequiredAmount = Number(wallet.minRequiredInr || (isUsd ? 10 : 200));

  return (
    <>
      {isLocked && (
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-rose-500/15 via-rose-500/10 to-red-500/15 border border-rose-500/30 dark:border-rose-500/40 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0 border border-rose-500/30">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                  Voiceforce Calling Suspended (Minimum {currencySymbol}{minRequiredAmount.toFixed(2)} Required)
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 uppercase">
                  Locked
                </span>
              </div>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5 max-w-2xl leading-relaxed">
                Your current balance is <strong className="font-semibold">{currencySymbol}{balanceInr.toFixed(2)}</strong>. Outbound calls and inbound AI pickup are locked. Top up the recommended {currencySymbol}{recommendedAmount.toFixed(2)} to resume operations and prevent numbers from entering carrier release.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsWalletOpen(true)}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/25 flex items-center gap-2 transition-all cursor-pointer flex-shrink-0"
          >
            <CreditCard className="w-4 h-4" />
            <span>Recharge {currencySymbol}{recommendedAmount.toLocaleString()} via Razorpay</span>
          </button>
        </div>
      )}

      {!isLocked && isLow && (
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-yellow-500/15 border border-amber-500/30 dark:border-amber-500/40 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0 border border-amber-500/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Prepaid Voice Wallet Balance Running Low
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 uppercase">
                  Low Balance
                </span>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5 max-w-2xl leading-relaxed">
                Your wallet balance is <strong className="font-semibold">{currencySymbol}{balanceInr.toFixed(2)}</strong>. Calling locks when balance drops below {currencySymbol}{minRequiredAmount.toFixed(2)}. Maintain at least {currencySymbol}{recommendedAmount.toFixed(2)} for uninterrupted calling and number lease continuity.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsWalletOpen(true)}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/25 flex items-center gap-2 transition-all cursor-pointer flex-shrink-0"
          >
            <CreditCard className="w-4 h-4" />
            <span>Top Up Wallet</span>
          </button>
        </div>
      )}

      <WalletLedgerDrawer
        isOpen={isWalletOpen}
        onClose={() => setIsWalletOpen(false)}
        onBalanceUpdated={fetchWallet}
      />

      <LiveScreenPopModal
        isOpen={isScreenPopOpen}
        onClose={() => setIsScreenPopOpen(false)}
        data={screenPopData}
      />
    </>
  );
}
