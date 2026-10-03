'use client';

import React from 'react';
import { AppShellLayout } from '@/components/common/AppShellLayout';
import { PaySidebar } from '@/components/pay/PaySidebar';
import { PayBottomNav } from '@/components/pay/PayBottomNav';
import { PayTransactionsView } from '@/components/pay/PayTransactionsView';

export default function PayTransactionsPage() {
  return (
    <AppShellLayout
      sidebar={<PaySidebar />}
      bottomNav={<PayBottomNav />}
      title="Incoming Transactions Ledger"
      badge="Receipts"
      badgeColor="purple"
    >
      <PayTransactionsView />
    </AppShellLayout>
  );
}
