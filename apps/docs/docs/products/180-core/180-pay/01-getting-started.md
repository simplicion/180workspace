---
id: getting-started
title: 180 Pay Quickstart
sidebar_label: 180 Pay Overview
sidebar_position: 1
description: The complete guide to 1-Click Sovereign Checkout, zero gateway setup fees, and frictionless payment collection.
---

# 180 Pay Quickstart

**180 Pay** is a 1-click checkout engine built specifically for developers, SaaS founders, and creators. It replaces bulky checkout flows and merchant registration hurdles with a unified, sovereign checkout sheet.

```mermaid
graph LR
    Customer[Customer on Your App] -->|Clicks "Upgrade"| Sheet[180 Pay Drawer / Popup]
    Sheet -->|Select UPI / Card / Wallet| PayEngine[180 Sovereign Vault]
    PayEngine -->|Captures Payment| BankSettlement[Settlement Engine]
    PayEngine -->|Signed HMAC Webhook| YourServer[Your Backend Server]
    YourServer -->|Provisions Plan| Customer
```

---

## Why Developers Choose 180 Pay

1. **Zero Gateway Rejection**: Launch on Day 1 without waiting weeks for corporate merchant approvals, GST documentation, or gateway security audits.
2. **Eliminates Gateway Redirection**: Traditional payment gateways force customers through 3 to 4 redirect hops. 180 Pay renders a native bottom sheet or popup, preserving your brand context and cutting checkout abandonment by over 60%.
3. **Automatic Currency & UPI Handling**: Supports domestic Indian UPI (Google Pay, PhonePe, Paytm, BHIM) and international credit/debit cards seamlessly.
4. **Predictable Developer Economics**: Only 1.5% platform fee on developer transactions with transparent T+1 clearing.

---

## 1-Minute Integration

Install the SDK:
```bash
npm install @workspace/identity-sdk
```

Launch the checkout drawer:
```tsx
import { OneEightyPay } from '@workspace/identity-sdk';

export function PurchaseButton() {
  const handlePay = () => {
    OneEightyPay.openBottomSheet({
      amount: 499,
      currency: 'INR',
      title: 'Pro Armor Upgrade',
      description: 'Instant access to premium edge cloaking and routing tools.',
      planCode: 'pro_plan',
      onSuccess: (data) => {
        console.log('Payment Successful! Session ID:', data.sessionId);
        alert('Thank you for subscribing!');
      },
      onCancel: () => {
        console.log('User closed payment sheet');
      },
    });
  };

  return <button onClick={handlePay}>Upgrade to Pro (₹499)</button>;
}
```

Next, see the [Checkout Integration](./checkout-integration) guide for iframe embeds and Web Component usage.
