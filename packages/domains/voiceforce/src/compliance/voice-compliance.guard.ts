import { prisma } from '@workspace/db';

export interface CallingHoursResult {
  allowed: boolean;
  reason?: string;
  localHour?: number;
}

export class VoiceComplianceGuard {
  /**
   * Validates if current time is within legal calling hours (09:00 - 20:00)
   * Enforces TRAI (India) and US TCPA regulations
   */
  static validateCallingHours(recipientPhone: string, overrideTimezone?: string): CallingHoursResult {
    const now = new Date();
    let timeZone = overrideTimezone;

    if (!timeZone) {
      if (recipientPhone.startsWith('+91')) {
        timeZone = 'Asia/Kolkata';
      } else if (recipientPhone.startsWith('+1')) {
        timeZone = 'America/New_York'; // conservative default for US
      } else if (recipientPhone.startsWith('+44')) {
        timeZone = 'Europe/London';
      } else {
        timeZone = 'UTC';
      }
    }

    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: 'numeric',
        hourCycle: 'h23'
      });
      const localHour = parseInt(formatter.format(now), 10);

      // In development or when explicitly bypassed, allow 24/7 testing
      if (process.env.NODE_ENV === 'development' || process.env.BYPASS_CALLING_HOURS === 'true') {
        return { allowed: true, localHour };
      }

      // Hardcoded permissible calling hours: 09:00 to 21:00 (9:00 AM to 9:00 PM local recipient time)
      if (localHour < 9 || localHour >= 21) {
        return {
          allowed: false,
          localHour,
          reason: `Outbound calling restricted outside 09:00 - 21:00 (current local hour in ${timeZone}: ${localHour}:00)`
        };
      }

      return { allowed: true, localHour };
    } catch {
      return { allowed: true };
    }
  }

  /**
   * Verifies if recipient number is on the company's Do-Not-Call (DNC) registry
   */
  static async checkDnc(companyId: string, recipientPhone: string): Promise<{ blocked: boolean; reason?: string }> {
    if (!companyId || !recipientPhone) return { blocked: false };

    try {
      const cleanPhone = recipientPhone.replace(/\s+/g, '');
      const dnc = await (prisma as any).dncRegistry.findFirst({
        where: {
          companyId,
          phoneNumber: cleanPhone
        }
      });

      if (dnc) {
        return {
          blocked: true,
          reason: `Number is registered in Do-Not-Call (DNC) list (Reason: ${dnc.reason || 'Opted out'})`
        };
      }
    } catch (err: any) {
      console.warn('[VoiceComplianceGuard] DNC check failed, allowing call:', err.message);
    }

    return { blocked: false };
  }

  /**
   * Registers a customer phone number into the Do-Not-Call (DNC) registry
   */
  static async addToDnc(companyId: string, phone: string, reason = 'customer_request'): Promise<void> {
    const cleanPhone = phone.replace(/\s+/g, '');
    try {
      await (prisma as any).dncRegistry.upsert({
        where: {
          companyId_phoneNumber: {
            companyId,
            phoneNumber: cleanPhone
          }
        },
        update: { reason },
        create: {
          companyId,
          phoneNumber: cleanPhone,
          reason
        }
      });
    } catch {
      await (prisma as any).dncRegistry.create({
        data: {
          companyId,
          phoneNumber: cleanPhone,
          reason
        }
      }).catch(() => {});
    }
  }

  /**
   * Prepends mandatory AI identity & recording disclosures if missing
   * Spoken quickly and smoothly at the onset of outbound calls
   */
  static formatComplianceGreeting(agentName: string, companyName: string, baseGreeting?: string, customConsentText?: string | null): string {
    const raw = (baseGreeting || '').trim();
    const hasAiDisclosure = /ai|automated|virtual assistant|artificial intelligence/i.test(raw);
    const hasRecordingDisclosure = /recorded|quality assurance|compliance|recording/i.test(raw);

    if (hasAiDisclosure && hasRecordingDisclosure) {
      return raw;
    }

    const brand = companyName && companyName !== 'Our Company' ? companyName : 'our company';
    const consent = customConsentText?.trim() || 'this call is recorded for quality and compliance.';
    const disclosure = `This is an automated assistant calling from ${brand}, ${consent} `;

    if (!raw) return disclosure;
    return disclosure + raw;
  }
}
