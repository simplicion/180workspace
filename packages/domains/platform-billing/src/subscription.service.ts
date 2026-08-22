import { prisma } from '@workspace/db';
import { Logger } from '@workspace/backend-infra';

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
        cancelReason: null
      }
    });

    Logger.info(`Frictionless trial started for company ${companyId} on plan ${plan.planName} until ${trialEndDate}`);
    return subscription;
  }

  /**
   * Generates a checkout session or mandate link to purchase additional storage via Razorpay.
   */
  async purchaseStorageAddon(gbAmount: number, companyId: string) {
    // Note: Integration with Razorpay will be built here when actual payment is made.
    // For now, it updates the DB if they have somehow processed the payment.
    
    // Convert GB to Bytes
    const bytesToAdd = gbAmount * 1073741824;

    const companyConfig = await prisma.companyConfig.update({
      where: { companyId },
      data: {
        extraStoragePurchasedBytes: {
          increment: bytesToAdd
        }
      }
    });

    Logger.info(`Added ${gbAmount}GB extra storage for company ${companyId}`);
    return companyConfig;
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
      return false; // No subscription found
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
      return null;
    }

    const plan = subscription.plan;
    const maxStorageBytes = plan.maxStorageBytes + (companyConfig.extraStoragePurchasedBytes || 0);

    return {
      planName: plan.planName,
      maxUsers: plan.maxUsers,
      maxApps: plan.maxApps,
      maxStorageBytes,
      storageUsedBytes: companyConfig.storageUsedBytes || 0,
      status: subscription.status,
      trialEndDate: subscription.trialEndDate
    };
  }
}

export const subscriptionService = new SubscriptionService();
