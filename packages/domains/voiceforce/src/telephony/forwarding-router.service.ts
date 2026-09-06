import axios from 'axios';
import { prisma } from '@workspace/db';

let customRedisClient: any = null;
function getRedis(): any {
  if (customRedisClient) return customRedisClient;
  try {
    if (process.env.REDIS_URL) {
      const Redis = require('ioredis');
      customRedisClient = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: true });
      return customRedisClient;
    }
  } catch {
    return null;
  }
  return null;
}

export function setRouterRedisClient(client: any) {
  customRedisClient = client;
}

const inMemoryRrCounters = new Map<string, number>();

export interface ForwardingDestination {
  type: 'phone' | 'agent';
  targetId?: string; // VoiceAgent ID if type === 'agent'
  e164?: string;     // E.164 phone number if type === 'phone'
  name?: string;     // Friendly name e.g. "Rajesh (Sales Lead)"
  priority: number;  // 1, 2, 3...
  timeoutSec?: number;
}

export interface RoutingDecision {
  action: 'ai_agent' | 'pstn_forward' | 'simultaneous_blast' | 'queue' | 'fallback_voicemail' | 'hangup';
  agentId?: string;
  destinationE164?: string;
  destinations?: ForwardingDestination[];
  timeoutSec: number;
  hopIndex: number;
  ruleId?: string;
  whisperText?: string;
  reason?: string;
}

export class ForwardingRouterService {
  private static telnyxBaseUrl = 'https://api.telnyx.com/v2';

  /**
   * Evaluates the initial routing decision for an incoming call to a company's phone number
   */
  static async evaluateInboundCall(
    companyId: string,
    phoneNumberE164: string,
    callerPhone: string
  ): Promise<RoutingDecision> {
    const cleanPhone = phoneNumberE164.replace(/\s+/g, '');

    // 1. Fetch phone number record and its associated forwarding rules
    const phoneRecord = await (prisma as any).phoneNumber.findFirst({
      where: { companyId, e164Number: cleanPhone },
      include: {
        forwardingRules: {
          where: { isActive: true },
          take: 1
        },
        assignedAgent: true
      }
    });

    if (!phoneRecord) {
      return {
        action: 'hangup',
        timeoutSec: 10,
        hopIndex: 0,
        reason: 'Phone number not registered or inactive'
      };
    }

    const rule = phoneRecord.forwardingRules?.[0];

    // If no active forwarding rule exists, fall back to direct agent assignment if present
    if (!rule) {
      if (phoneRecord.assignedAgentId) {
        return {
          action: 'ai_agent',
          agentId: phoneRecord.assignedAgentId,
          timeoutSec: 30,
          hopIndex: 0,
          reason: 'Direct AI Employee answering'
        };
      }
      return {
        action: 'hangup',
        timeoutSec: 10,
        hopIndex: 0,
        reason: 'No forwarding rule or answering agent assigned'
      };
    }

    return this.evaluateRuleRouting(rule, companyId, callerPhone);
  }

  /**
   * Directly evaluates a forwarding rule (usable by inbound call, webhooks, and standalone testing)
   */
  static async evaluateRuleRouting(
    rule: any,
    companyId: string,
    callerPhone?: string
  ): Promise<RoutingDecision> {
    // 1. Schedule Check: Is it within configured business hours?
    if (rule.scheduleEnabled && rule.businessHours) {
      const isWithinHours = this.checkBusinessHours(rule.businessHours, rule.timezone || 'Asia/Kolkata');
      if (!isWithinHours) {
        return this.resolveFallback(rule, 'Call received outside configured business hours');
      }
    }

    // 2. Strategy: Queue First / Active Hold Room (Callers placed directly in queue room)
    if (rule.strategy === 'queue_first' || rule.strategy === 'queue') {
      return {
        action: 'queue',
        timeoutSec: rule.ringTimeoutSec || 300,
        hopIndex: 0,
        ruleId: rule.id,
        reason: 'Configured for immediate queueing'
      };
    }

    // 3. Parse and sort destinations by priority
    const rawDestinations: ForwardingDestination[] = Array.isArray(rule.destinations) ? rule.destinations : [];
    const sortedDestinations = [...rawDestinations].sort((a, b) => (a.priority || 0) - (b.priority || 0));

    if (sortedDestinations.length === 0) {
      return this.resolveFallback(rule, 'No forwarding destinations configured');
    }

    // 4. Strategy: Simultaneous Blast
    if (rule.strategy === 'simultaneous' || rule.strategy === 'simultaneous_blast') {
      return {
        action: 'simultaneous_blast',
        destinations: sortedDestinations,
        timeoutSec: rule.ringTimeoutSec || 20,
        hopIndex: 0,
        ruleId: rule.id,
        whisperText: rule.whisperAnnouncement || undefined,
        reason: `Simultaneous blast across ${sortedDestinations.length} destinations`
      };
    }

    // 5. Strategy: Round-Robin Load Balancing
    if (rule.strategy === 'round_robin') {
      let rrIndex = 0;
      const key = `voiceforce:rr:${rule.id}`;
      const redis = getRedis();
      let assignedVal: number | null = null;
      if (redis) {
        try {
          assignedVal = await redis.incr(key);
        } catch {
          assignedVal = null;
        }
      }
      if (assignedVal === null) {
        const next = (inMemoryRrCounters.get(key) || 0) + 1;
        inMemoryRrCounters.set(key, next);
        assignedVal = next;
      }
      rrIndex = (assignedVal - 1) % sortedDestinations.length;
      const chosen = sortedDestinations[rrIndex];
      return this.destinationToDecision(chosen, rule, 0, 'Round-robin assigned target');
    }

    // 6. Strategy: Sequential Waterfall (Default) -> Start at Hop 0
    return this.evaluateNextHop(rule, 0, companyId);
  }

  /**
   * Cascades call to the next hop when current target reports busy or times out
   */
  static async evaluateNextHop(
    rule: any,
    hopIndex: number,
    companyId: string
  ): Promise<RoutingDecision> {
    const rawDestinations: ForwardingDestination[] = Array.isArray(rule.destinations) ? rule.destinations : [];
    const sortedDestinations = [...rawDestinations].sort((a, b) => (a.priority || 0) - (b.priority || 0));

    // Check maximum hops (telecom circular loop prevention guard)
    const maxHops = rule.maxHops || 4;
    if (hopIndex >= sortedDestinations.length || hopIndex >= maxHops) {
      return this.resolveFallback(rule, `All ${sortedDestinations.length} forwarding destinations exhausted or loop limit reached`);
    }

    const currentTarget = sortedDestinations[hopIndex];

    // Check target availability
    const isAvailable = await this.isDestinationAvailable(currentTarget, companyId);
    if (!isAvailable) {
      // Immediate cascade to next hop if target is currently known busy
      return this.evaluateNextHop(rule, hopIndex + 1, companyId);
    }

    return this.destinationToDecision(currentTarget, rule, hopIndex, `Cascade hop #${hopIndex + 1}`);
  }

  /**
   * Checks whether a destination is currently available or busy
   */
  private static async isDestinationAvailable(
    dest: ForwardingDestination,
    companyId: string
  ): Promise<boolean> {
    const redis = getRedis();
    if (dest.type === 'agent' && dest.targetId) {
      const agent = await (prisma as any).voiceAgent.findFirst({
        where: { id: dest.targetId, companyId, isActive: true }
      });
      if (!agent) return false;

      // Count active calls on this agent in Redis
      if (redis) {
        const activeCount = parseInt((await redis.get(`voiceforce:active:agent:${agent.id}`)) || '0', 10);
        const maxConcurrent = agent.maxDurationSeconds ? 5 : 5; // standard concurrent capacity
        if (activeCount >= maxConcurrent) return false;
      }
      return true;
    }

    if (dest.type === 'phone' && dest.e164) {
      // Check if this phone number has an active call lock in Redis
      if (redis) {
        const lock = await redis.get(`voiceforce:call_lock:${dest.e164}`);
        if (lock) return false; // Already in a call
      }
      return true;
    }

    return true;
  }

  /**
   * Transforms a ForwardingDestination into a RoutingDecision
   */
  private static destinationToDecision(
    dest: ForwardingDestination,
    rule: any,
    hopIndex: number,
    reason: string
  ): RoutingDecision {
    if (dest.type === 'agent' && dest.targetId) {
      return {
        action: 'ai_agent',
        agentId: dest.targetId,
        timeoutSec: dest.timeoutSec || rule.ringTimeoutSec || 20,
        hopIndex,
        ruleId: rule.id,
        whisperText: rule.whisperAnnouncement || undefined,
        reason
      };
    }

    return {
      action: 'pstn_forward',
      destinationE164: dest.e164,
      timeoutSec: dest.timeoutSec || rule.ringTimeoutSec || 20,
      hopIndex,
      ruleId: rule.id,
      whisperText: rule.whisperAnnouncement || undefined,
      reason
    };
  }

  /**
   * Resolves fallback destination when all forwarding attempts fail
   */
  static resolveFallback(rule: any, reason: string): RoutingDecision {
    const fallbackType = rule?.fallbackType || 'ai_agent';

    if (fallbackType === 'ai_agent' && rule?.fallbackAgentId) {
      return {
        action: 'ai_agent',
        agentId: rule.fallbackAgentId,
        timeoutSec: 30,
        hopIndex: 99,
        ruleId: rule?.id,
        reason: `${reason} -> Deflected to fallback AI Employee`
      };
    }

    if (fallbackType === 'queue') {
      return {
        action: 'queue',
        timeoutSec: 300,
        hopIndex: 99,
        ruleId: rule?.id,
        reason: `${reason} -> Deflected to Active Hold Queue`
      };
    }

    if (fallbackType === 'voicemail') {
      return {
        action: 'fallback_voicemail',
        timeoutSec: 60,
        hopIndex: 99,
        ruleId: rule?.id,
        reason: `${reason} -> Routed to Smart AI Voicemail`
      };
    }

    return {
      action: 'hangup',
      timeoutSec: 5,
      hopIndex: 99,
      ruleId: rule?.id,
      reason: `${reason} -> Terminated`
    };
  }

  /**
   * Validates if current local time is within business hours
   */
  static checkBusinessHours(hoursConfig: any, timezone = 'Asia/Kolkata'): boolean {
    try {
      const now = new Date();
      // Formatter in specified timezone
      const dayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: timezone });
      const timeFormatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', hour12: false, timeZone: timezone });

      const dayKey = dayFormatter.format(now).toLowerCase(); // 'mon', 'tue', etc.
      const currentHm = timeFormatter.format(now); // '14:30'

      const daySchedule = hoursConfig[dayKey];
      if (!daySchedule || !daySchedule.enabled) return false;

      const [curH, curM] = currentHm.split(':').map(Number);
      const [startH, startM] = (daySchedule.start || '09:00').split(':').map(Number);
      const [endH, endM] = (daySchedule.end || '18:00').split(':').map(Number);

      const curMins = curH * 60 + curM;
      const startMins = startH * 60 + startM;
      const endMins = endH * 60 + endM;

      return curMins >= startMins && curMins <= endMins;
    } catch {
      return true; // Default allow if schedule parsing fails
    }
  }

  /**
   * Executes a Telnyx Call Control transfer to an external PSTN number
   */
  static async executeTelnyxTransfer(
    callControlId: string,
    targetE164: string,
    fromE164?: string
  ): Promise<{ success: boolean; error?: string }> {
    const apiKey = process.env.TELNYX_API_KEY;
    if (!apiKey || !callControlId) {
      return { success: false, error: 'Telnyx credentials or callControlId missing' };
    }

    try {
      await axios.post(
        `${this.telnyxBaseUrl}/calls/${callControlId}/actions/transfer`,
        {
          to: targetE164,
          ...(fromE164 ? { from: fromE164 } : {})
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 7000
        }
      );
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.response?.data?.errors?.[0]?.detail || err.message };
    }
  }
}
