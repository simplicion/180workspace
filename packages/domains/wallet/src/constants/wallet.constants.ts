export class WalletConstants {
  /**
   * Hard server-side calling threshold.
   * If tenant balance is below ₹200.00, all outbound/inbound telephony operations are rejected.
   */
  static readonly MIN_WALLET_THRESHOLD_INR = 200.0;

  /**
   * Recommended operational wallet balance to ensure uninterrupted telephony.
   */
  static readonly RECOMMENDED_WALLET_INR = 1000.0;

  /**
   * Telephony call metering rate: ₹6.00 per billable minute (60s minimum increment).
   */
  static readonly RATE_PER_MINUTE_INR = 6.0;

  /**
   * Monthly dedicated virtual DID lease price.
   */
  static readonly NUMBER_MONTHLY_RENTAL_INR = 149.0;

  /**
   * Cooling-down grace period (in days) before unpaid numbers are auto-released from Telnyx.
   */
  static readonly AUTO_RELEASE_GRACE_DAYS = 5;

  /**
   * Standard currency.
   */
  static readonly CURRENCY = 'INR';
}
