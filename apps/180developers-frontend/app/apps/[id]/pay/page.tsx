'use client';

import React from 'react';
import { AppShellLayout } from '@/components/common/AppShellLayout';
import { PaySidebar } from '@/components/pay/PaySidebar';
import { PayBottomNav } from '@/components/pay/PayBottomNav';
import { PayOverviewView } from '@/components/pay/PayOverviewView';

export default function PayOverviewPage() {
  return (
    <AppShellLayout
      sidebar={<PaySidebar />}
      bottomNav={<PayBottomNav />}
      title="180 Pay Overview & Analytics"
      badge="Checkout Engine"
      badgeColor="purple"
    >
      <PayOverviewView />
    </AppShellLayout>
  );
}
