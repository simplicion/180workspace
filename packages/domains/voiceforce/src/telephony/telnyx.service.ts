import axios from 'axios';

export interface TelnyxNumberSearchResult {
  phoneNumber: string;
  countryCode: string;
  monthlyCostUsd: number;
  region: string;
}

export class TelnyxService {
  private apiKey: string;
  private baseUrl = 'https://api.telnyx.com/v2';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.TELNYX_API_KEY || '';
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Search available virtual numbers in country
   */
  async searchNumbers(countryCode = 'US', limit = 5): Promise<TelnyxNumberSearchResult[]> {
    if (!this.apiKey) return [];
    try {
      const response = await axios.get(`${this.baseUrl}/available_phone_numbers`, {
        headers: this.headers,
        params: {
          'filter[country_code]': countryCode,
          'filter[limit]': limit,
          'filter[features]': 'voice'
        }
      });

      return (response.data.data || []).map((item: any) => ({
        phoneNumber: item.phone_number,
        countryCode: item.country_code,
        monthlyCostUsd: Number(item.cost_information?.monthly_cost) || 1.0,
        region: item.region_information?.region_name || 'National'
      }));
    } catch (err: any) {
      console.error('[TelnyxService] Error searching numbers:', err.response?.data || err.message);
      return [];
    }
  }

  /**
   * Purchase a virtual phone number (DID)
   */
  async purchaseNumber(phoneNumber: string): Promise<{ success: boolean; id?: string; error?: string }> {
    if (!this.apiKey) return { success: false, error: 'Telnyx API key not configured' };
    try {
      const response = await axios.post(
        `${this.baseUrl}/number_orders`,
        { phone_numbers: [{ phone_number: phoneNumber }] },
        { headers: this.headers }
      );
      return { success: true, id: response.data.data?.id };
    } catch (err: any) {
      return { success: false, error: err.response?.data?.errors?.[0]?.detail || err.message };
    }
  }

  /**
   * Request Outbound Caller ID Verification for existing business number (sends SMS or Call OTP)
   */
  async requestCallerIdVerification(phoneNumber: string): Promise<{ success: boolean; verificationId?: string; error?: string }> {
    if (!this.apiKey) return { success: false, error: 'Telnyx API key not configured' };
    try {
      const response = await axios.post(
        `${this.baseUrl}/verified_numbers`,
        { phone_number: phoneNumber },
        { headers: this.headers }
      );
      return { success: true, verificationId: response.data.data?.id };
    } catch (err: any) {
      return { success: false, error: err.response?.data?.errors?.[0]?.detail || err.message };
    }
  }

  /**
   * Verify Caller ID with OTP received by user
   */
  async submitCallerIdOtp(verificationId: string, code: string): Promise<{ verified: boolean; error?: string }> {
    if (!this.apiKey) return { verified: false, error: 'Telnyx API key not configured' };
    try {
      const response = await axios.post(
        `${this.baseUrl}/verified_numbers/${verificationId}/actions/verify`,
        { code },
        { headers: this.headers }
      );
      return { verified: response.data.data?.verification_status === 'verified' };
    } catch (err: any) {
      return { verified: false, error: err.response?.data?.errors?.[0]?.detail || err.message };
    }
  }
}
