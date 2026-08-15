export const PRICING_PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    priceId: 'price_starter', // Replace with actual Stripe/Razorpay price ID
    price: 2,
    features: {
      maxApps: 4,
      storageLimitGB: 10, // Assuming 10GB base for Starter, overage charged at $2/10GB
      hasAIAssistant: false,
      hasEmailServices: false,
      maxTeamMembers: 2,
    },
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    priceId: 'price_professional',
    price: 12,
    features: {
      maxApps: 7,
      storageLimitGB: 20, // Assuming 20GB base for Pro, overage charged at $2/10GB
      hasAIAssistant: true,
      hasEmailServices: true,
      maxTeamMembers: 5,
    },
  },
  unlimited: {
    id: 'unlimited',
    name: 'Unlimited',
    priceId: 'price_unlimited',
    price: 15,
    features: {
      maxApps: -1, // -1 means unlimited
      storageLimitGB: 50,
      hasAIAssistant: true,
      hasEmailServices: true,
      maxTeamMembers: 20,
    },
  },
};

export const METERED_RATES = {
  storage: {
    pricePerBlock: 2,
    blockSizeGB: 10,
  },
  teamMembers: {
    pricePerMember: 2,
  },
};

export type PlanId = keyof typeof PRICING_PLANS;
