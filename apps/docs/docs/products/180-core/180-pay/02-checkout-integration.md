---
id: checkout-integration
title: Checkout Integration & Embeddable Components
sidebar_label: Checkout & Embeds
sidebar_position: 2
description: Embedding 180 Pay checkout sheets, responsive pricing tables, Web Components, and server-side checkout session creation.
---

# Checkout Integration & Embeddable Components

180 Pay provides three ways to integrate payments:
1. **Interactive Client Drawer (`OneEightyPay.openBottomSheet`)**
2. **Embeddable Sovereign Pricing Table (`<one-eighty-pricing-table>` & React Component)**
3. **Server-Side Checkout Session API (`POST /api/v1/checkout/sessions`)**

---

## 1. Client Drawer Method

```tsx
import { OneEightyPay } from '@workspace/identity-sdk';

OneEightyPay.openBottomSheet({
  amount: 25.00,
  currency: 'USD', // 'USD', 'INR', 'EUR', 'GBP'
  title: 'Starter Edge Tier',
  description: 'Monthly edge routing quota',
  planCode: 'traffic-starter',
  metadata: {
    userId: 'usr_123',
    companyId: 'org_456',
  },
  onSuccess: (res) => {
    // res: { success: true, sessionId: "cs_...", transactionId: "tx_..." }
  },
  onCancel: () => {
    // User dismissed the checkout drawer
  },
});
```

---

## 2. Embeddable Sovereign Pricing Table

You can build and customize your tiers directly in the **180 Developer Portal -> Pricing Tables Studio**, and embed the resulting table anywhere with one line of code:

### Option A: React / Next.js Component
```tsx
import { OneEightyPricingTable } from '@workspace/identity-sdk';

export function PricingSection() {
  return (
    <OneEightyPricingTable
      appId="YOUR_APP_ID"
      theme="auto" // 'dark' | 'light' | 'auto'
      accentColor="#8b5cf6"
      onSelectPlan={(plan) => console.log('Selected:', plan)}
    />
  );
}
```

### Option B: Zero-Framework Sovereign Web Component
```html
<script src="https://auth.180workspace.com/sdk/v1/180-core-sdk.js" async></script>

<one-eighty-pricing-table
  app-id="YOUR_APP_ID"
  theme="auto"
  accent-color="#8b5cf6">
</one-eighty-pricing-table>
```

### Option C: Responsive IFrame
```html
<iframe
  src="https://auth.180workspace.com/embed/pricing/YOUR_APP_ID"
  width="100%"
  height="720"
  frameborder="0"
  scrolling="no"
  style="border:none;border-radius:24px;overflow:hidden;"
></iframe>
```

---

## 3. Server-to-Server Checkout Session Creation

If you want to initiate checkout from your backend before redirecting the customer:

### Request:
```http
POST /api/v1/checkout/sessions
Host: services.180workspace.com
Content-Type: application/json

{
  "clientId": "180_client_b26aee801c22cb3295f041ff2a3597db",
  "clientSecret": "180_secret_...",
  "amount": 50.00,
  "currency": "USD",
  "title": "Pro Armor Monthly",
  "description": "Unlimited smart cloaking rules",
  "mode": "subscription", // "payment" (one-time) or "subscription" (recurring)
  "planCode": "traffic-pro",
  "returnUrl": "https://yourapp.com/dashboard?payment=success",
  "cancelUrl": "https://yourapp.com/pricing?payment=cancelled",
  "metadata": {
    "organizationId": "org_987",
    "customerEmail": "founder@startup.io"
  }
}
```

### Response:
```json
{
  "success": true,
  "sessionId": "cs_08ba67aa9755_9a1b8c7d",
  "checkoutUrl": "https://auth.180workspace.com/pay/checkout/cs_08ba67aa9755_9a1b8c7d",
  "amount": 50.00,
  "currency": "USD",
  "status": "PENDING"
}
```
Redirect the user to `checkoutUrl` or pass `sessionId` to `OneEightyPay.openBottomSheet({ sessionId })`.
