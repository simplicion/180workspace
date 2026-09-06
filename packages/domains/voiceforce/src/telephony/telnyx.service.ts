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
  async purchaseNumber(phoneNumber: string): Promise<{ success: boolean; id?: string; phoneNumberId?: string; error?: string }> {
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
      const orderData = response.data?.data;
      const orderedPhone = orderData?.phone_numbers?.[0];
      const phoneNumberId = orderedPhone?.id || null;
      return { success: true, id: orderData?.id, phoneNumberId: phoneNumberId || undefined };
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
   * Release / Delete a phone number or verified caller ID permanently from Telnyx carrier exchange
   */
  async releaseNumber(phoneNumberOrId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.apiKey) return { success: false, error: 'Telnyx API key not configured' };
    const rawTarget = (phoneNumberOrId || '').trim();
    if (!rawTarget) return { success: true };

    const cleanTarget = rawTarget.replace(/\s+/g, '');
    let deleted = false;
    let lastError = '';

    // If it's a virtual mock ID like did_virtual_..., no carrier action needed
    if (cleanTarget.startsWith('did_virtual_')) {
      return { success: true };
    }

    try {
      let resolvedPhoneId: string | null = null;
      let deletionLocked = false;

      // 1. Resolve phone number via inventory query if input looks like a phone number
      const phoneDigits = cleanTarget.replace(/[^0-9+]/g, '');
      const searchCandidates: string[] = [];
      if (phoneDigits.startsWith('+')) {
        searchCandidates.push(phoneDigits);
        searchCandidates.push(phoneDigits.substring(1));
      } else if (/^\d{10,15}$/.test(phoneDigits)) {
        searchCandidates.push(`+${phoneDigits}`);
        searchCandidates.push(phoneDigits);
      }

      for (const candidate of searchCandidates) {
        if (resolvedPhoneId) break;
        try {
          const searchRes = await axios.get(`${this.baseUrl}/phone_numbers`, {
            headers: this.headers,
            params: { 'filter[phone_number]': candidate }
          });
          const found = searchRes.data?.data?.[0];
          if (found?.id) {
            resolvedPhoneId = found.id;
            deletionLocked = Boolean(found.deletion_lock_enabled);
            break;
          }
        } catch {
          // ignore and try next format
        }
      }

      // If not resolved yet and cleanTarget looks like a Telnyx resource ID
      if (!resolvedPhoneId && /^[0-9a-fA-F-]+$/.test(cleanTarget)) {
        try {
          const getRes = await axios.get(`${this.baseUrl}/phone_numbers/${encodeURIComponent(cleanTarget)}`, {
            headers: this.headers
          });
          if (getRes.data?.data?.id) {
            resolvedPhoneId = getRes.data.data.id;
            deletionLocked = Boolean(getRes.data.data.deletion_lock_enabled);
          }
        } catch {
          // May be an order ID or not found
        }
      }

      // If resolved a phone number resource ID, unlock (if needed) and delete
      if (resolvedPhoneId) {
        if (deletionLocked) {
          try {
            await axios.patch(
              `${this.baseUrl}/phone_numbers/${encodeURIComponent(resolvedPhoneId)}`,
              { deletion_lock_enabled: false },
              { headers: this.headers }
            );
          } catch (lockErr: any) {
            console.warn('[TelnyxService] Notice: Could not clear deletion lock:', lockErr.message);
          }
        }

        const delRes = await axios.delete(
          `${this.baseUrl}/phone_numbers/${encodeURIComponent(resolvedPhoneId)}`,
          { headers: this.headers }
        );
        if (delRes.status === 200 || delRes.status === 204 || delRes.data?.data?.status === 'deleted') {
          deleted = true;
        }
      } else if (cleanTarget.startsWith('+') || /^\d{10,15}$/.test(phoneDigits)) {
        // Fallback direct delete attempt by target
        try {
          const directDel = await axios.delete(
            `${this.baseUrl}/phone_numbers/${encodeURIComponent(cleanTarget)}`,
            { headers: this.headers }
          );
          if (directDel.status === 200 || directDel.status === 204) {
            deleted = true;
          }
        } catch (dErr: any) {
          lastError = dErr.response?.data?.errors?.[0]?.detail || dErr.message;
        }
      }
    } catch (err: any) {
      lastError = err.response?.data?.errors?.[0]?.detail || err.message;
    }

    // 2. Also remove from verified_numbers if it was an external verified business caller ID
    const normalizedE164 = cleanTarget.startsWith('+') ? cleanTarget : `+${cleanTarget}`;
    try {
      const vResponse = await axios.delete(
        `${this.baseUrl}/verified_numbers/${encodeURIComponent(normalizedE164)}`,
        { headers: this.headers }
      );
      if (vResponse.status === 200 || vResponse.status === 204) {
        deleted = true;
      }
    } catch (vErr: any) {
      if (vErr.response?.status !== 404 && !deleted) {
        lastError = vErr.response?.data?.errors?.[0]?.detail || vErr.message;
      }
    }

    const isAlreadyGone = lastError.toLowerCase().includes('not found') || 
                          lastError.includes('10005') || 
                          lastError.toLowerCase().includes('does not exist');

    return { 
      success: deleted || isAlreadyGone, 
      error: (deleted || isAlreadyGone) ? undefined : lastError 
    };
  }
}

