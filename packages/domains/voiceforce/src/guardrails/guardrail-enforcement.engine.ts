import { prisma } from '@workspace/db';

export interface GuardrailRuleDo {
  id: string;
  category: 'service' | 'compliance' | 'sales' | 'escalation';
  rule: string;
  instruction: string;
  priority: 'critical' | 'high' | 'standard';
}

export interface GuardrailRuleDont {
  id: string;
  category: 'pricing' | 'competitors' | 'legal' | 'pii' | 'topics';
  rule: string;
  constraint: string;
  enforcement: 'strict_block' | 'polite_decline' | 'escalate_human';
}

export interface AgentGuardrailRules {
  version: number;
  dos: GuardrailRuleDo[];
  donts: GuardrailRuleDont[];
}

export const DEFAULT_AGENT_GUARDRAIL_RULES: AgentGuardrailRules = {
  version: 1,
  dos: [
    {
      id: 'do-1',
      category: 'compliance',
      rule: 'Disclose AI Identity',
      instruction: 'Politely inform the customer you are an autonomous AI voice employee if asked directly.',
      priority: 'critical'
    },
    {
      id: 'do-2',
      category: 'service',
      rule: 'Confirm Customer Name & Request',
      instruction: 'Always repeat and confirm order, booking, or request details before executing tools.',
      priority: 'high'
    },
    {
      id: 'do-3',
      category: 'sales',
      rule: 'Offer Standard 10% Retention Discount',
      instruction: 'If a prospective lead hesitates on price, you are permitted to offer up to 10% promotional discount.',
      priority: 'standard'
    }
  ],
  donts: [
    {
      id: 'dont-1',
      category: 'pii',
      rule: 'Never Collect Credit Card Numbers',
      constraint: 'Voice PCI DSS prohibited: Never ask caller to read 16-digit card numbers or CVV codes out loud.',
      enforcement: 'strict_block'
    },
    {
      id: 'dont-2',
      category: 'competitors',
      rule: 'Never Criticize Competitors',
      constraint: 'Refrain from disparaging competitor brands or comparing unverified competitor pricing.',
      enforcement: 'polite_decline'
    },
    {
      id: 'dont-3',
      category: 'pricing',
      rule: 'Never Promise Unauthorized Delivery Windows',
      constraint: 'Do not promise same-day delivery under 60 minutes without direct dispatch confirmation.',
      enforcement: 'polite_decline'
    }
  ]
};

export interface GuardrailCheckResult {
  allowed: boolean;
  overridden: boolean;
  reason?: string;
  sanitizedArguments?: Record<string, any>;
  actionRequired?: 'notify_manager' | 'block' | 'proceed';
}

export class GuardrailEnforcementEngine {
  /**
   * Enforces hard financial, order, and scheduling limits before executing any AI tool
   */
  static async validateToolAction(
    voiceAgentId: string,
    companyId: string,
    toolName: string,
    rawArgs: Record<string, any> = {},
    customGuardrails?: any
  ): Promise<GuardrailCheckResult> {
    const args = rawArgs || {};

    // 1. Fetch agent's active guardrails (or use custom / company defaults)
    let guardrail = customGuardrails;
    if (!guardrail && voiceAgentId) {
      try {
        guardrail = await (prisma as any).voiceAgentGuardrail.findUnique({
          where: { voiceAgentId }
        });
      } catch (err: any) {
        // Fallback to defaults
      }
    }

    // 1b. Enforce Prohibited Boundaries (Don'ts)
    const donts: GuardrailRuleDont[] = Array.isArray(guardrail?.rules?.donts) ? guardrail.rules.donts : [];
    for (const d of donts) {
      if (d.enforcement === 'strict_block') {
        if (d.category === 'pricing' && (toolName === 'apply_discount' || toolName === 'override_pricing')) {
          return {
            allowed: false,
            overridden: false,
            reason: `Action blocked by corporate policy: ${d.rule}. ${d.constraint || ''}`
          };
        }
        if (d.category === 'pii' && (toolName === 'record_payment_card' || toolName === 'collect_ssn' || toolName === 'collect_credit_card')) {
          return {
            allowed: false,
            overridden: false,
            reason: `Strict PCI DSS compliance violation: ${d.rule}. ${d.constraint || ''}`
          };
        }
      }
    }

    const maxDiscountPercent = guardrail?.maxDiscountPercent ?? 10.0;
    const maxDiscountAmount = guardrail?.maxDiscountAmount ?? 50.0;
    const maxOrderValue = guardrail?.maxOrderValue ?? 1000.0;
    const minLeadTimeHours = guardrail?.minLeadTimeHours ?? 2;

    const sanitized = { ...args };

    // 2. Enforce Discount Limits
    if (toolName === 'apply_discount' || args.discountPercent !== undefined || args.discountAmount !== undefined) {
      if (args.discountPercent !== undefined && args.discountPercent > maxDiscountPercent) {
        sanitized.discountPercent = maxDiscountPercent;
        return {
          allowed: true,
          overridden: true,
          sanitizedArguments: sanitized,
          reason: `Requested discount (${args.discountPercent}%) exceeded maximum permitted threshold (${maxDiscountPercent}%). Capped to ${maxDiscountPercent}%.`
        };
      }

      if (args.discountAmount !== undefined && args.discountAmount > maxDiscountAmount) {
        sanitized.discountAmount = maxDiscountAmount;
        return {
          allowed: true,
          overridden: true,
          sanitizedArguments: sanitized,
          reason: `Requested discount amount (${args.discountAmount}) exceeded maximum permitted cap (${maxDiscountAmount}). Capped to ${maxDiscountAmount}.`
        };
      }
    }

    // 3. Enforce Order Value Approval Threshold
    if (toolName === 'create_sales_order' || toolName === 'create_order') {
      const orderTotal = Number(rawArgs.totalAmount || rawArgs.total || rawArgs.price || 0);
      if (orderTotal > maxOrderValue) {
        sanitized.status = 'pending_approval';
        sanitized.requiresManagerApproval = true;
        return {
          allowed: true,
          overridden: true,
          sanitizedArguments: sanitized,
          actionRequired: 'notify_manager',
          reason: `Order value (${orderTotal}) exceeds auto-approval ceiling (${maxOrderValue}). Flagged for manager review.`
        };
      }
    }

    // 4. Enforce Scheduling Minimum Lead Time
    if (toolName === 'book_appointment' || toolName === 'schedule_meeting') {
      if (rawArgs.dateTime || rawArgs.startTime) {
        const targetDate = new Date(rawArgs.dateTime || rawArgs.startTime);
        const earliestAllowed = new Date(Date.now() + minLeadTimeHours * 60 * 60 * 1000);

        if (targetDate < earliestAllowed) {
          return {
            allowed: false,
            overridden: false,
            reason: `Appointments require at least ${minLeadTimeHours} hours advance notice. Earliest available slot is after ${earliestAllowed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
          };
        }
      }
    }

    return { allowed: true, overridden: false, sanitizedArguments: sanitized };
  }

  /**
   * Redacts sensitive PCI/PII data (credit cards, SSNs) from text and transcripts
   */
  static redactPciPii(text: string): { cleanedText: string; hasRedactions: boolean } {
    if (!text) return { cleanedText: '', hasRedactions: false };

    // Credit Card regex (13-19 digits with spaces/dashes)
    const cardRegex = /\b(?:\d[ -]*?){13,19}\b/g;
    // US SSN format (XXX-XX-XXXX)
    const ssnRegex = /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g;

    let hasRedactions = false;
    let cleaned = text.replace(cardRegex, (match) => {
      // Basic Luhn length sanity check
      const digitsOnly = match.replace(/\D/g, '');
      if (digitsOnly.length >= 13 && digitsOnly.length <= 19) {
        hasRedactions = true;
        return '[REDACTED_PAYMENT_CARD]';
      }
      return match;
    });

    cleaned = cleaned.replace(ssnRegex, () => {
      hasRedactions = true;
      return '[REDACTED_SSN]';
    });

    return { cleanedText: cleaned, hasRedactions };
  }

  /**
   * Compiles typed Guardrail rules (Do's and Don'ts) into system prompt directives
   */
  static compileGuardrailsToPrompt(rules?: any): string {
    if (!rules) return '';
    const dos = Array.isArray(rules.dos) ? rules.dos : [];
    const donts = Array.isArray(rules.donts) ? rules.donts : [];

    if (dos.length === 0 && donts.length === 0) return '';

    let promptBlock = '\n\n=== CORPORATE GUARDRAILS & TRUST DIRECTIVES ===\n';

    if (dos.length > 0) {
      promptBlock += '\n### MANDATORY OPERATIONAL BEHAVIORS (WHAT TO DO):\n';
      dos.forEach((d: any, idx: number) => {
        const priorityTag = d.priority ? `[${d.priority.toUpperCase()}] ` : '';
        promptBlock += `${idx + 1}. ${priorityTag}${d.rule}${d.instruction ? `: ${d.instruction}` : ''}\n`;
      });
    }

    if (donts.length > 0) {
      promptBlock += '\n### STRICT COMPLIANCE BOUNDARIES (WHAT NOT TO DO):\n';
      donts.forEach((d: any, idx: number) => {
        const enforcementTag = d.enforcement ? `[ENFORCE: ${d.enforcement.replace(/_/g, ' ').toUpperCase()}] ` : '';
        promptBlock += `${idx + 1}. ${enforcementTag}${d.rule}${d.constraint ? `: ${d.constraint}` : ''}\n`;
      });
    }

    promptBlock += '\nAdhere strictly to all Do\'s and Don\'ts above under all conversational circumstances.\n';
    return promptBlock;
  }
}
