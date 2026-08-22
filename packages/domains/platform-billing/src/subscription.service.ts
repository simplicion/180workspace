import { prisma } from '@workspace/db';

export class SubscriptionService {
  /**
   * Starts a frictionless 14-day trial without requiring a credit card mandate.
   * This is initiated via a hardcoded coupon during workspace setup.
   */
  async startFrictionlessTrial(planId: string, companyId: string, couponCode: string) {
    if (!couponCode) {
      throw new Error('A valid coupon code is required to start a trial.');
    }

    // Verify the plan exists
    const plan = await prisma.plan.findUnique({
      where: { id: planId }
    });

    if (!plan) {
      throw new Error('Plan not found.');
    }

    const trialStartDate = new Date();
    const trialEndDate = new Date();
    trialEndDate.setDate(trialStartDate.getDate() + plan.trialDays);

    // Create the subscription record
    const subscription = await prisma.subscription.create({
      data: {
        companyId,
        planId,
        status: 'trial',
        provider: 'none',
        trialStartDate,
        trialEndDate,
        mandateStatus: 'bypassed', // Bypassed for card-free trial
        cancelReason: null,
        amount: plan.price
      }
    });

    console.log(`Frictionless trial started for company ${companyId} on plan ${plan.planName} until ${trialEndDate}`);
    return subscription;
  }


  /**
   * Checks if the company's subscription is active or in trial.
   * Returns false if the trial has expired and they haven't upgraded.
   */
  async isSubscriptionValid(companyId: string): Promise<boolean> {
    const subscription = await prisma.subscription.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' }
    });

    if (!subscription) {
      return true; // Graceful fallback to free starter plan
    }

    if (subscription.status === 'active') {
      return true;
    }

    if (subscription.status === 'trial') {
      const now = new Date();
      if (subscription.trialEndDate && now <= subscription.trialEndDate) {
        return true;
      }
      return false; // Trial expired
    }

    return false;
  }

  /**
   * Retrieves the current plan and usage limits for a company.
   */
  async getSubscriptionLimits(companyId: string) {
    const subscription = await prisma.subscription.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        plan: true
      }
    });

    const companyConfig = await prisma.companyConfig.findUnique({
      where: { companyId }
    });

    if (!subscription || !subscription.plan || !companyConfig) {
      // Dynamic fallback to the starter/free plan
      const freePlan = await prisma.plan.findFirst({ where: { price: 0 }});
      if (freePlan && companyConfig) {
        return {
          planName: freePlan.planName,
          maxUsers: freePlan.maxUsers,
          maxApps: freePlan.maxApps,
          maxStorageBytes: freePlan.maxStorageBytes,
          storageUsedBytes: companyConfig.storageUsedBytes || 0,
          status: 'active',
          trialEndDate: null
        };
      }
      return null;
    }

    const plan = subscription.plan;
    const maxStorageBytes = plan.maxStorageBytes;
    const maxApps = plan.maxApps;

    return {
      planName: plan.planName,
      maxUsers: plan.maxUsers,
      maxApps,
      maxStorageBytes,
      storageUsedBytes: companyConfig.storageUsedBytes || 0,
      status: subscription.status,
      trialEndDate: subscription.trialEndDate
    };
  }
}

export const subscriptionService = new SubscriptionService();
