import axios from 'axios';
import { prisma } from '@workspace/db';
import { AccessToken } from 'livekit-server-sdk';
import { getLiveKitCredentials } from '../config/livekit-env';

export interface EscalationCheckResult {
  shouldEscalate: boolean;
  reason?: string;
}

export class HumanEscalationService {
  /**
   * Evaluates if transcript or sentiment warrants immediate escalation to a human
   */
  static shouldTriggerEscalation(transcript: string, sentiment?: string): EscalationCheckResult {
    const text = (transcript || '').toLowerCase();

    // Direct human request phrases
    const directPhrases = [
      'talk to a human',
      'speak to a human',
      'talk to someone',
      'speak to someone',
      'real person',
      'transfer me',
      'human agent',
      'customer service representative',
      'talk to your manager',
      'speak to your manager'
    ];

    for (const phrase of directPhrases) {
      if (text.includes(phrase)) {
        return {
          shouldEscalate: true,
          reason: `Customer explicitly requested human intervention: "${phrase}"`
        };
      }
    }

    // Frustration triggers
    const frustrationWords = ['terrible', 'horrible', 'lawyer', 'sue you', 'fraud', 'useless', 'furious'];
    if (sentiment === 'negative') {
      for (const word of frustrationWords) {
        if (text.includes(word)) {
          return {
            shouldEscalate: true,
            reason: `Severe customer frustration detected (Negative sentiment with trigger word: "${word}")`
          };
        }
      }
    }

    return { shouldEscalate: false };
  }

  /**
   * Transfers a live PSTN call via Telnyx SIP Refer / Transfer
   */
  static async transferCallPstn(
    callSessionId: string,
    targetPhoneNumber: string,
    telnyxCallControlId?: string
  ): Promise<{ success: boolean; message: string }> {
    const telnyxApiKey = process.env.TELNYX_API_KEY;

    try {
      if (telnyxApiKey && telnyxCallControlId) {
        await axios.post(
          `https://api.telnyx.com/v2/calls/${telnyxCallControlId}/actions/transfer`,
          { to: targetPhoneNumber },
          {
            headers: {
              'Authorization': `Bearer ${telnyxApiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 5000
          }
        );
      }

      await prisma.callSession.update({
        where: { id: callSessionId },
        data: {
          callOutcome: 'escalated_to_human',
          disconnectReason: `Transferred to human agent at ${targetPhoneNumber}`
        }
      });

      return {
        success: true,
        message: `Call successfully transferred to human agent at ${targetPhoneNumber}`
      };
    } catch (err: any) {
      console.error('[HumanEscalationService] Telnyx transfer failed:', err.response?.data || err.message);
      return {
        success: false,
        message: `Failed to initiate carrier transfer: ${err.message}`
      };
    }
  }

  /**
   * Generates a live operator token to join an active LiveKit room for instant takeover
   */
  static async createOperatorTakeoverToken(
    roomName: string,
    operatorUserId: string,
    operatorName: string
  ): Promise<string> {
    const { apiKey, apiSecret } = getLiveKitCredentials();

    const at = new AccessToken(apiKey, apiSecret, {
      identity: `operator_${operatorUserId}`,
      name: operatorName || 'Human Operator',
      ttl: '1h'
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true
    });

    return await at.toJwt();
  }
}
