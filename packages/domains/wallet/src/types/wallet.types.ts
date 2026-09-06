export type WalletTransactionType =
  | 'topup'
  | 'call_deduction'
  | 'number_rental'
  | 'number_purchase'
  | 'refund'
  | 'grace_period_warning'
  | 'number_auto_released'
  | 'manual_adjustment';

export interface WalletBalanceInfo {
  companyId: string;
  balanceInr: number;
  isLocked: boolean;
  isLow: boolean;
  minRequiredInr: number;
  recommendedInr: number;
  autoRecharge: boolean;
  thresholdInr: number;
  rechargeAmountInr: number;
  currency: string;
  currencySymbol: string;
}

export interface CreditCheckResult {
  allowed: boolean;
  balance: number;
  minRequired: number;
  recommended: number;
  message?: string;
}

export interface DeductionOptions {
  companyId: string;
  amountInr: number;
  type: WalletTransactionType;
  description: string;
  callSessionId?: string;
  paymentRef?: string;
  metadata?: Record<string, any>;
}

export interface CreditOptions {
  companyId: string;
  amountInr: number;
  type: WalletTransactionType;
  description: string;
  paymentRef?: string;
  metadata?: Record<string, any>;
}

export interface AutoRechargeConfig {
  autoRecharge?: boolean;
  thresholdInr?: number;
  rechargeAmountInr?: number;
}

export interface LedgerFilter {
  page?: number;
  limit?: number;
  type?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface PaginatedTransactions {
  transactions: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WalletSummary {
  balanceInr: number;
  lifetimeSpendInr: number;
  lifetimeCreditedInr: number;
  thirtyDayBurnInr: number;
  dailyAverageBurnInr: number;
  estimatedRunwayDays: number | null;
}

export interface TaxReceiptInfo {
  receiptNumber: string;
  transactionId: string;
  paymentRef: string;
  date: Date;
  companyId: string;
  companyName: string;
  hsnSacCode: string; // '9984'
  description: string;
  baseAmountInr: number;
  cgstInr: number;
  sgstInr: number;
  igstInr: number;
  totalAmountInr: number;
  gstRatePercent: number; // 18%
}

export interface PlatformWalletSummary {
  totalCompanies: number;
  lockedCompanies: number;
  totalBalanceInr: number;
  totalCredited24hInr: number;
  totalDebited24hInr: number;
  activeNumbersCount: number;
}

export interface WalletCouponValidationResult {
  valid: boolean;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;
  originalAmount: number;
  finalPayableAmount: number;
  isFree: boolean;
  message?: string;
  error?: string;
}

export interface WalletOrderResult {
  success: boolean;
  orderId?: string;
  amountInr: number;
  amountPaise?: number;
  creditedAmount: number;
  discountAmount: number;
  couponCode?: string;
  currency: string;
  keyId?: string;
  isFree?: boolean;
  newBalance?: number;
}

