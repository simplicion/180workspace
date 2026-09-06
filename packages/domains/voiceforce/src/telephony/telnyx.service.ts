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
   * Search available virtual numbers in country with optional area code
   */
  async searchNumbers(countryCode = 'US', limit = 10, areaCode?: string): Promise<TelnyxNumberSearchResult[]> {
    if (!this.apiKey) return [];
    try {
      const params: any = {
        'filter[country_code]': countryCode,
        'filter[limit]': limit,
        'filter[features]': 'voice'
      };
      if (areaCode && areaCode.trim()) {
        params['filter[national_destination_code]'] = areaCode.trim();
      }

      const response = await axios.get(`${this.baseUrl}/available_phone_numbers`, {
        headers: this.headers,
        params
      });

      return (response.data.data || []).map((item: any) => ({
        phoneNumber: item.phone_number,
        countryCode: item.country_code || countryCode,
        monthlyCostUsd: Number(item.cost_information?.monthly_cost) || 1.0,
        region: item.region_information?.[0]?.region_name || item.region_information?.region_name || 'National'
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
      const connId = process.env.TELNYX_SIP_CONNECTION_ID || process.env.TELNYX_APPLICATION_ID;
      const payload: any = { phone_numbers: [{ phone_number: phoneNumber }] };
      if (connId) {
        payload.connection_id = connId;
      }
      const response = await axios.post(
        `${this.baseUrl}/number_orders`,
        payload,
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
  async requestCallerIdVerification(phoneNumber: string, method: 'sms' | 'call' = 'sms'): Promise<{ success: boolean; verificationId?: string; error?: string }> {
    if (!this.apiKey) return { success: false, error: 'Telnyx API key not configured' };
    try {
      const cleanPhone = phoneNumber.replace(/\s+/g, '');
      const response = await axios.post(
        `${this.baseUrl}/verified_numbers`,
        { 
          phone_number: cleanPhone,
          verification_method: method
        },
        { headers: this.headers }
      );
      return { success: true, verificationId: cleanPhone };
    } catch (err: any) {
      const detail = err.response?.data?.errors?.[0]?.detail || err.message;
      return { success: false, error: detail };
    }
  }

  /**
   * Verify Caller ID with OTP received by user
   */
  async submitCallerIdOtp(phoneNumber: string, code: string): Promise<{ verified: boolean; error?: string }> {
    if (!this.apiKey) return { verified: false, error: 'Telnyx API key not configured' };
    try {
      const cleanPhone = phoneNumber.replace(/\s+/g, '');
      const encodedNumber = encodeURIComponent(cleanPhone);
      const response = await axios.post(
        `${this.baseUrl}/verified_numbers/${encodedNumber}/actions/verify`,
        { verification_code: code.trim() },
        { headers: this.headers }
      );
      const status = response.data?.data?.verification_status;
      return { verified: status === 'verified' || response.status === 200 };
    } catch (err: any) {
      const detail = err.response?.data?.errors?.[0]?.detail || err.message;
      return { verified: false, error: detail };
    }
  }

  /**
   * Assign phone number to a Telnyx Call Control / SIP connection
   */
  async assignNumberToConnection(phoneNumberIdOrE164: string, connectionId?: string): Promise<{ success: boolean; error?: string }> {
    if (!this.apiKey) return { success: false, error: 'Telnyx API key not configured' };
    try {
      const connId = connectionId || process.env.TELNYX_SIP_CONNECTION_ID || process.env.TELNYX_APPLICATION_ID;
      if (!connId) return { success: true }; // No connection configured to attach

      const cleanTarget = encodeURIComponent(phoneNumberIdOrE164.replace(/\s+/g, ''));
      await axios.patch(
        `${this.baseUrl}/phone_numbers/${cleanTarget}`,
        { connection_id: connId },
        { headers: this.headers }
      );
      return { success: true };
    } catch (err: any) {
      const detail = err.response?.data?.errors?.[0]?.detail || err.message;
      return { success: false, error: detail };
    }
  }

  /**
   * Release / Delete a phone number or verified caller ID permanently from Telnyx
   */
  async releaseNumber(phoneNumberIdOrE164: string): Promise<{ success: boolean; error?: string }> {
    if (!this.apiKey) return { success: false, error: 'Telnyx API key not configured' };
    const cleanTarget = phoneNumberIdOrE164.replace(/\s+/g, '');
    let deleted = false;
    let lastError = '';

    // 1. If it's a virtual DID purchased on Telnyx, find its exact Telnyx resource ID
    try {
      let targetId = cleanTarget;
      // If passing an E.164 phone number, query Telnyx to get the resource ID
      if (cleanTarget.startsWith('+')) {
        const searchRes = await axios.get(`${this.baseUrl}/phone_numbers`, {
          headers: this.headers,
          params: { 'filter[phone_number]': cleanTarget }
        });
        const found = searchRes.data?.data?.[0];
        if (found?.id) {
          targetId = found.id;
        }
      }

      const response = await axios.delete(
        `${this.baseUrl}/phone_numbers/${encodeURIComponent(targetId)}`,
        { headers: this.headers }
      );
      if (response.status === 200 || response.status === 204) {
        deleted = true;
      }
    } catch (err: any) {
      lastError = err.response?.data?.errors?.[0]?.detail || err.message;
    }

    // 2. Also attempt deletion from verified_numbers in case it is a verified business caller ID
    if (cleanTarget.startsWith('+')) {
      try {
        const vResponse = await axios.delete(
          `${this.baseUrl}/verified_numbers/${encodeURIComponent(cleanTarget)}`,
          { headers: this.headers }
        );
        if (vResponse.status === 200 || vResponse.status === 204) {
          deleted = true;
        }
      } catch (vErr: any) {
        // If not in verified_numbers (404), that's expected for purchased DIDs
        if (vErr.response?.status !== 404) {
          lastError = vErr.response?.data?.errors?.[0]?.detail || vErr.message;
        }
      }
    }

    return { 
      success: deleted || lastError.toLowerCase().includes('not found') || lastError.includes('10005'), 
      error: deleted ? undefined : lastError 
    };
  }
}

