import { prisma } from '@workspace/db';
import { OneEightyPayPlatformProvider } from '@workspace/platform-billing';

export interface SocialBillingStatus {
    canAccess: boolean;
    isTrial: boolean;
    trialDaysRemaining: number;
    trialEndDate: string | null;
    hasActiveSubscription: boolean;
    hasActivePass: boolean;
    passDaysRemaining: number;
    subscriptionEndDate: string | null;
    planName: string | null;
    dailyRate: number;
    monthlyRate: number;
    lockReason?: string;
    message?: string;
}

export class SocialBillingService {
    private static providerInstance: OneEightyPayPlatformProvider | null = null;

    private static getProvider(): OneEightyPayPlatformProvider {
        if (!this.providerInstance) {
            const clientId = process.env.SOCIAL_STUDIO_180_CLIENT_ID || '180_client_266753c1171df1e2c4a391483fd2e02e';
            const clientSecret = process.env.SOCIAL_STUDIO_180_CLIENT_SECRET;
            const webhookSecret = process.env.SOCIAL_STUDIO_180_PAY_WEBHOOK_SECRET;

            if (!clientSecret || !webhookSecret) {
                console.warn('[SocialBillingService] SOCIAL_STUDIO_180_CLIENT_SECRET or SOCIAL_STUDIO_180_PAY_WEBHOOK_SECRET not defined in environment.');
            }

            this.providerInstance = new OneEightyPayPlatformProvider({
                clientId,
                clientSecret: clientSecret || '',
                webhookSecret: webhookSecret || '',
            });
        }
        return this.providerInstance;
    }

    /**
     * Checks creator entitlement for 180 Social Studio:
     * 1. 3-Day Free Trial upon account creation (user.createdAt + 3 days).
     * 2. Active Monthly Subscription ($20/mo).
     * 3. Active Flexible Daily Pass ($0.71/day recharge).
     */
    static async getBillingStatus(userId: string, companyId?: string): Promise<SocialBillingStatus> {
        const targetCompanyId = companyId || userId;
        const now = new Date();

        // 1. Fetch User details for trial calculation
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, createdAt: true, email: true }
        });

        const userCreatedAt = user?.createdAt || now;
        const trialEndDate = new Date(userCreatedAt.getTime() + 3 * 24 * 60 * 60 * 1000);
        const msUntilTrialEnd = trialEndDate.getTime() - now.getTime();
        const isTrial = msUntilTrialEnd > 0;
        const trialDaysRemaining = isTrial ? Math.max(1, Math.ceil(msUntilTrialEnd / (1000 * 60 * 60 * 24))) : 0;

        // 2. Fetch Subscription / Pass records
        const activeSub = await prisma.subscription.findFirst({
            where: {
                companyId: targetCompanyId,
                status: { in: ['active', 'ACTIVE'] },
            },
            include: { plan: true },
            orderBy: { createdAt: 'desc' }
        });


        let hasActiveSubscription = false;
        let hasActivePass = false;
        let passDaysRemaining = 0;
        let subscriptionEndDate: string | null = null;
        let planName: string | null = null;

        if (activeSub) {
            const endDate = activeSub.subscriptionEndDate || activeSub.trialEndDate;
            if (endDate && new Date(endDate).getTime() > now.getTime()) {
                subscriptionEndDate = endDate.toISOString();
                planName = activeSub.plan?.planName || '180 Social Studio Access';
                const msLeft = new Date(endDate).getTime() - now.getTime();
                const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

                if (activeSub.plan?.billingCycle === 'daily' || activeSub.plan?.planName?.includes('Daily Pass')) {
                    hasActivePass = true;
                    passDaysRemaining = Math.max(1, daysLeft);
                } else {
                    hasActiveSubscription = true;
                }
            }
        }

        const canAccess = isTrial || hasActiveSubscription || hasActivePass;

        return {
            canAccess,
            isTrial,
            trialDaysRemaining,
            trialEndDate: isTrial ? trialEndDate.toISOString() : null,
            hasActiveSubscription,
            hasActivePass,
            passDaysRemaining,
            subscriptionEndDate,
            planName,
            dailyRate: 0.71, // $20 / 28 days baseline ($0.714/day)
            monthlyRate: 20.00,
            lockReason: canAccess ? undefined : 'subscriptionExpired',
            message: canAccess
                ? (isTrial ? `3-Day Free Trial active (${trialDaysRemaining} day${trialDaysRemaining > 1 ? 's' : ''} left)` : 'Access active')
                : 'Your 3-day free trial has expired. Subscribe or recharge to unlock full creator access.'
        };
    }

    /**
     * Returns plan definitions & pricing
     */
    static async getPlans() {
        const plans = await prisma.plan.findMany({
            where: {
                isActive: true,
                planName: {
                    in: [
                        '180 Social Studio Creator (Monthly)',
                        '180 Social Studio Flexible Daily Pass'
                    ]
                }
            }
        });

        return {
            plans,
            monthly: {
                planName: '180 Social Studio Creator',
                price: 20.00,
                currency: 'USD',
                billingCycle: 'monthly',
                trialDays: 3,
                description: 'Full unlimited monthly access for solo creators'
            },
            recharge: {
                planName: 'Flexible Daily Pass',
                basePrice: 20.00,
                baseDays: 28,
                dailyRate: 0.71,
                currency: 'USD',
                minDays: 1,
                maxDays: 28,
                description: 'Pay-as-you-go creator pass. Slide to choose active days.'
            }
        };
    }

    /**
     * Creates a checkout session via 180 Pay
     */
    static async createCheckout(
        userId: string,
        companyId: string,
        userEmail: string,
        params: { type: 'monthly' | 'recharge'; days?: number; returnUrl?: string }
    ) {
        const provider = this.getProvider();
        const type = params.type || 'monthly';
        const targetCompanyId = companyId || userId;

        let amount = 20.00;
        let title = '180 Social Studio Creator (Monthly)';
        let days = 30;

        if (type === 'recharge') {
            days = Math.max(1, Math.min(28, Number(params.days) || 1));
            // $20 / 28 days = $0.714285...
            amount = Math.round(days * (20 / 28) * 100) / 100;
            title = `180 Social Studio Pass (${days} Day${days > 1 ? 's' : ''})`;
        }

        const session = await provider.createCheckoutSession({
            planId: type === 'monthly' ? 'plan_social_studio_monthly_20' : 'plan_social_studio_daily_pass',
            amount,
            currency: 'USD',
            customerDetails: { email: userEmail },
            notes: {
                purpose: type === 'monthly' ? 'social_studio_monthly' : 'social_studio_recharge',
                userId,
                companyId: targetCompanyId,
                type,
                days,
                planName: title,
                returnUrl: params.returnUrl || 'workspace180://oauth/callback'
            }
        });

        return {
            checkoutUrl: session.url,
            orderId: session.providerOrderId,
            amount,
            currency: 'USD',
            title,
            type,
            days
        };
    }

    /**
     * Webhook Handler for 180 Pay
     */
    static async handleWebhook(rawBody: string | Buffer, headers: any) {
        const provider = this.getProvider();
        const event = await provider.verifyWebhook(rawBody, headers);

        if (event && event.event === 'PAYMENT_SUCCESS') {
            const notes = event.data?.notes || {};
            const { userId, companyId, type, days } = notes;
            const targetCompanyId = companyId || userId;

            if (targetCompanyId) {
                const now = new Date();
                let subEndDate = new Date();

                // Find plan
                const plan = await prisma.plan.findFirst({
                    where: {
                        planName: type === 'monthly'
                            ? '180 Social Studio Creator (Monthly)'
                            : '180 Social Studio Flexible Daily Pass'
                    }
                }) || await prisma.plan.findFirst();

                if (type === 'recharge') {
                    const rechargeDays = Number(days) || 1;
                    // Check if existing sub is active, extend it; otherwise start from now
                    const existing = await prisma.subscription.findFirst({
                        where: { companyId: targetCompanyId, status: 'active' },
                        orderBy: { createdAt: 'desc' }
                    });

                    const baseDate = (existing?.subscriptionEndDate && existing.subscriptionEndDate > now)
                        ? existing.subscriptionEndDate
                        : now;

                    subEndDate = new Date(baseDate.getTime() + rechargeDays * 24 * 60 * 60 * 1000);
                } else {
                    // Monthly: +30 days
                    subEndDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                }

                // Deactivate prior active subs
                await prisma.subscription.updateMany({
                    where: { companyId: targetCompanyId, status: 'active' },
                    data: { status: 'cancelled', cancelledAt: now }
                });

                // Create active subscription/pass record
                await prisma.subscription.create({
                    data: {
                        companyId: targetCompanyId,
                        planId: plan?.id || 'default_plan',
                        status: 'active',
                        provider: '180pay',
                        providerOrderId: event.data?.providerOrderId || `180pay_${Date.now()}`,
                        providerPaymentId: event.data?.providerPaymentId,
                        paymentStatus: 'paid',
                        amount: Number(event.data?.amount) || (type === 'monthly' ? 20 : 0.71),
                        currency: 'USD',
                        subscriptionStartDate: now,
                        subscriptionEndDate: subEndDate,
                        autopayEnabled: type === 'monthly'
                    }
                });

                console.log(`[SocialBillingService] Activated ${type} access for ${targetCompanyId} until ${subEndDate.toISOString()}`);
            }
        }

        return { success: true };
    }
}
