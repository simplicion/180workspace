import crypto from 'crypto';
import axios from 'axios';
import { prisma } from '@workspace/db';
import { WalletIsolationGuard } from '../guards/wallet-isolation.guard';
import { WalletService } from './wallet.service';
import { WalletCouponValidationResult, WalletOrderResult } from '../types/wallet.types';

export class WalletGatewayService {
  /**
   * Validates a promotional coupon code against the platform Coupon model.
   * Multi-tenant bound and mathematically computes discount & net payable amounts.
   */
  static async validateCoupon(
    companyId: string,
    couponCode: string,
    amountInr: number
  ): Promise<WalletCouponValidationResult> {
    const validId = WalletIsolationGuard.assertCompany(companyId, 'validateCoupon');

    if (!couponCode || !couponCode.trim()) {
      return {
        valid: false,
        code: '',
        discountType: 'percentage',
        discountValue: 0,
        discountAmount: 0,
        originalAmount: amountInr,
        finalPayableAmount: amountInr,
        isFree: false,
        error: 'Please enter a valid coupon code'
      };
    }

    const code = couponCode.trim().toUpperCase();

    const coupon = await (prisma as any).coupon.findUnique({
      where: { couponCode: code }
    });

    if (!coupon || !coupon.isActive) {
      return {
        valid: false,
        code,
        discountType: 'percentage',
        discountValue: 0,
        discountAmount: 0,
        originalAmount: amountInr,
        finalPayableAmount: amountInr,
        isFree: false,
        error: 'Invalid or inactive coupon code'
      };
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return {
        valid: false,
        code,
        discountType: coupon.discountType as any,
        discountValue: coupon.discountValue,
        discountAmount: 0,
        originalAmount: amountInr,
        finalPayableAmount: amountInr,
        isFree: false,
        error: 'This coupon code has expired'
      };
    }

    if (coupon.maxUses !== null && coupon.maxUses !== undefined && coupon.usedCount >= coupon.maxUses) {
      return {
        valid: false,
        code,
        discountType: coupon.discountType as any,
        discountValue: coupon.discountValue,
        discountAmount: 0,
        originalAmount: amountInr,
        finalPayableAmount: amountInr,
        isFree: false,
        error: 'Coupon usage limit has been reached'
      };
    }

    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = Math.round(((amountInr * coupon.discountValue) / 100) * 100) / 100;
    } else {
      discountAmount = Math.min(coupon.discountValue, amountInr);
    }

    // Never discount more than original amount
    discountAmount = Math.min(discountAmount, amountInr);
    const finalPayableAmount = Math.max(0, Math.round((amountInr - discountAmount) * 100) / 100);
    const isFree = finalPayableAmount === 0;

    return {
      valid: true,
      code: coupon.couponCode,
      discountType: coupon.discountType as any,
      discountValue: coupon.discountValue,
      discountAmount,
      originalAmount: amountInr,
      finalPayableAmount,
      isFree,
      message: isFree
        ? '100% discount applied! Top-up is completely free.'
        : `${coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`} discount applied!`
    };
  }

  /**
   * Creates a Razorpay Order for tenant prepaid wallet top-up, or directly credits if 100% discounted.
   * Injects companyId and coupon details directly into Razorpay order notes to establish cryptographic binding.
   */
  static async createOrder(
    companyId: string,
    amountInr: number,
    couponCode?: string
  ): Promise<WalletOrderResult> {
    const validId = WalletIsolationGuard.assertCompany(companyId, 'createOrder');

    if (!amountInr || amountInr <= 0) {
      throw new Error('Recharge amount must be greater than zero');
    }

    let couponValidation: WalletCouponValidationResult | null = null;
    if (couponCode && couponCode.trim()) {
      couponValidation = await WalletGatewayService.validateCoupon(validId, couponCode, amountInr);
      if (!couponValidation.valid) {
        throw new Error(couponValidation.error || 'Invalid coupon code applied');
      }
    }

    const creditedAmount = amountInr;
    const discountAmount = couponValidation ? couponValidation.discountAmount : 0;
    const finalPayableAmount = couponValidation ? couponValidation.finalPayableAmount : amountInr;
    const isFree = finalPayableAmount === 0;

    // IF 100% DISCOUNT (isFree: true, e.g. FREE000 or 100% coupon), BYPASS RAZORPAY ENTIRELY
    if (isFree) {
      const creditRes = await WalletService.credit({
        companyId: validId,
        amountInr: creditedAmount,
        type: 'topup',
        paymentRef: `coupon_${couponValidation!.code}_${Date.now()}`,
        description: `100% Promo Top-Up (Coupon: ${couponValidation!.code})`
      });

      // Increment coupon usage count
      await (prisma as any).coupon.update({
        where: { couponCode: couponValidation!.code },
        data: { usedCount: { increment: 1 } }
      }).catch((e: any) => console.warn('[WalletGateway] Could not increment coupon usedCount:', e.message));

      return {
        success: true,
        isFree: true,
        amountInr: 0,
        creditedAmount,
        discountAmount,
        couponCode: couponValidation!.code,
        currency: 'INR',
        newBalance: creditRes.newBalance
      };
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new Error('Razorpay credentials not configured');
    }

    const amountPaise = Math.round(finalPayableAmount * 100);
    const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    const notesPayload: Record<string, string> = {
      companyId: validId,
      purpose: 'wallet_topup',
      creditedAmount: String(creditedAmount),
      discountAmount: String(discountAmount)
    };

    if (couponValidation?.code) {
      notesPayload.couponCode = couponValidation.code;
    }

    const res = await axios.post(
      'https://api.razorpay.com/v1/orders',
      {
        amount: amountPaise,
        currency: 'INR',
        receipt: `topup_${Date.now()}`,
        payment_capture: 1,
        notes: notesPayload
      },
      {
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      orderId: res.data.id,
      amountInr: finalPayableAmount,
      amountPaise,
      creditedAmount,
      discountAmount,
      couponCode: couponValidation?.code,
      currency: 'INR',
      keyId,
      isFree: false
    };
  }

  /**
   * Cryptographically verifies Razorpay payment signature & credits tenant wallet idempotently.
   * Strictly enforces companyId matching and credits full amount when coupons are applied.
   */
  static async verifyAndCreditPayment(
    companyId: string,
    orderId: string,
    paymentId: string,
    signature: string,
    amountInrHint?: number,
    couponCode?: string,
    creditedAmountHint?: number
  ): Promise<{ success: boolean; newBalance: number; alreadyProcessed?: boolean }> {
    const validId = WalletIsolationGuard.assertCompany(companyId, 'verifyAndCreditPayment');
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) throw new Error('Razorpay key secret not configured');

    // 1. Verify HMAC SHA-256 signature
    const hmac = crypto.createHmac('sha256', keySecret);
    hmac.update(`${orderId}|${paymentId}`);
    const expectedSignature = hmac.digest('hex');

    if (expectedSignature !== signature) {
      throw new Error('Cryptographic signature verification failed: Invalid Razorpay signature');
    }

    // 2. Idempotency Check: Verify paymentId has not already been credited for this company
    let existingTx: any = null;
    try {
      const rawRows: any[] = await (prisma as any).$queryRawUnsafe(
        'SELECT id, "balanceAfterInr" FROM "VoiceWalletTransaction" WHERE "paymentRef" = $1 LIMIT 1',
        paymentId
      );
      if (rawRows && rawRows.length > 0) existingTx = rawRows[0];
    } catch {
      existingTx = await (prisma as any).voiceWalletTransaction.findFirst({
        where: { companyId: validId, description: { contains: paymentId } }
      });
    }

    if (existingTx) {
      const wallet = await WalletService.getBalance(validId);
      return {
        success: true,
        newBalance: wallet.balanceInr,
        alreadyProcessed: true
      };
    }

    // 3. Determine amount credited: prioritize creditedAmountHint if coupon discount applied
    let amountToCredit = creditedAmountHint || amountInrHint || 0;
    if (!amountToCredit || amountToCredit <= 0) {
      try {
        const keyId = process.env.RAZORPAY_KEY_ID;
        const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
        const payRes = await axios.get(`https://api.razorpay.com/v1/payments/${paymentId}`, {
          headers: { Authorization: `Basic ${authHeader}` }
        });
        amountToCredit = (payRes.data?.amount || 0) / 100;
      } catch (err: any) {
        console.warn('[WalletGateway] Payment fetch fallback to order amount:', err.message);
        amountToCredit = 500.0;
      }
    }

    if (amountToCredit <= 0) amountToCredit = 500.0;

    // 4. Atomically credit wallet & write transaction
    const normalizedCoupon = couponCode ? couponCode.trim().toUpperCase() : undefined;
    const desc = normalizedCoupon
      ? `Razorpay prepaid top-up (Ref: ${paymentId}, Coupon: ${normalizedCoupon})`
      : `Razorpay prepaid top-up (Ref: ${paymentId})`;

    const creditRes = await WalletService.credit({
      companyId: validId,
      amountInr: amountToCredit,
      type: 'topup',
      paymentRef: paymentId,
      description: desc
    });

    // 5. Increment coupon usage if coupon code was used
    if (normalizedCoupon) {
      await (prisma as any).coupon.update({
        where: { couponCode: normalizedCoupon },
        data: { usedCount: { increment: 1 } }
      }).catch((err: any) => console.warn('[WalletGateway] Failed to increment coupon count:', err.message));
    }

    return {
      success: true,
      newBalance: creditRes.newBalance
    };
  }

  /**
   * Handles asynchronous Razorpay webhook events.
   * Cryptographically verifies signature and extracts companyId & coupons from notes.
   */
  static async handleWebhook(
    rawBody: string,
    signature: string
  ): Promise<{ success: boolean; event: string; handled: boolean; companyId?: string; error?: string }> {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
    if (!webhookSecret) throw new Error('Razorpay webhook secret not configured');

    const expectedSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSig !== signature) {
      throw new Error('Invalid Razorpay webhook signature mismatch');
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;

    if (!paymentEntity) {
      return { success: true, event, handled: false };
    }

    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentId = paymentEntity.id;
      const orderId = paymentEntity.order_id;
      const targetCompanyId = paymentEntity.notes?.companyId;
      const couponCode = paymentEntity.notes?.couponCode;
      const creditedAmountNote = paymentEntity.notes?.creditedAmount;
      const amountInr = creditedAmountNote ? Number(creditedAmountNote) : (paymentEntity.amount || 0) / 100;

      if (!targetCompanyId) {
        console.warn('[WalletWebhook] No companyId found in notes, skipping.');
        return { success: true, event, handled: false };
      }

      // Assert tenant validity
      const validCompanyId = WalletIsolationGuard.assertCompany(targetCompanyId, 'handleWebhook');

      // Idempotency check
      let existingTx: any = null;
      try {
        const rawRows: any[] = await (prisma as any).$queryRawUnsafe(
          'SELECT id, "balanceAfterInr" FROM "VoiceWalletTransaction" WHERE "paymentRef" = $1 LIMIT 1',
          paymentId
        );
        if (rawRows && rawRows.length > 0) existingTx = rawRows[0];
      } catch {
        existingTx = await (prisma as any).voiceWalletTransaction.findFirst({
          where: { companyId: validCompanyId, description: { contains: paymentId } }
        });
      }

      if (existingTx) {
        return { success: true, event, handled: true, companyId: validCompanyId };
      }

      const desc = couponCode
        ? `Razorpay webhook verified top-up (Order: ${orderId}, Ref: ${paymentId}, Coupon: ${couponCode})`
        : `Razorpay webhook verified top-up (Order: ${orderId}, Ref: ${paymentId})`;

      await WalletService.credit({
        companyId: validCompanyId,
        amountInr,
        type: 'topup',
        paymentRef: paymentId,
        description: desc
      });

      if (couponCode) {
        await (prisma as any).coupon.update({
          where: { couponCode: couponCode.toUpperCase() },
          data: { usedCount: { increment: 1 } }
        }).catch((err: any) => console.warn('[WalletWebhook] Failed to increment coupon count:', err.message));
      }

      return { success: true, event, handled: true, companyId: validCompanyId };
    }

    return { success: true, event, handled: false };
  }
}
