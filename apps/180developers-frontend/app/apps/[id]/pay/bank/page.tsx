'use client';

import React from 'react';
import { AppShellLayout } from '@/components/common/AppShellLayout';
import { PaySidebar } from '@/components/pay/PaySidebar';
import { PayBottomNav } from '@/components/pay/PayBottomNav';
import { PayBankView } from '@/components/pay/PayBankView';

export default function PayBankPage() {
  return (
    <AppShellLayout
      sidebar={<PaySidebar />}
      bottomNav={<PayBottomNav />}
      title="Settlement Bank & UPI Verification"
      badge="Compliance"
      badgeColor="purple"
    >
      <PayBankView />
    </AppShellLayout>
  );
}
