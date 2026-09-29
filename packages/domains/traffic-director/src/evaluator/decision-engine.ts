import { EvaluationResult, ExtractedSignals, RuleCondition } from '../types';
import { ThreatIntelligenceService } from '../services/threat-intelligence.service';

export interface EvaluatableRule {
  id: string;
  name: string;
  priority: number;
  isActive: boolean;
  destinationUrl: string;
  actionType: string;
  conditions: any; // RuleCondition[] or stringified JSON
  weight?: number;
}

export interface EvaluatableLink {
  id: string;
  fallbackUrl: string;
  isActive: boolean;
  warmupUntil?: Date | string | null;
  rampUpEnabled?: boolean;
  rampUpDurationHours?: number;
  datacenterBlocked?: boolean;
  blockSpyServices?: boolean;
  blockVpn?: boolean;
  safePageProxyMode?: boolean;
  createdAt?: Date | string | null;
  rules: EvaluatableRule[];
}

export class DecisionEngine {
  static evaluate(link: EvaluatableLink, signals: ExtractedSignals): EvaluationResult {
    const startTime = performance.now();
    const fallbackAction = link.safePageProxyMode === true ? 'proxy_safe_page' : 'redirect_302';

    if (!link.isActive) {
      const elapsed = Math.round(performance.now() - startTime);
      return {
        matchedRuleId: null,
        matchedRuleName: null,
        destinationUrl: link.fallbackUrl,
        actionType: fallbackAction,
        isFallback: true,
        evaluationLatencyMs: elapsed,
        signals
      };
    }

    const now = Date.now();

    // 1. Temporal Warmup Check (Serve 100% clean fallback during ad QA review window)
    if (link.warmupUntil) {
      const warmupTime = new Date(link.warmupUntil).getTime();
      if (now < warmupTime) {
        const elapsed = Math.round(performance.now() - startTime);
        return {
          matchedRuleId: null,
          matchedRuleName: 'Temporal Warmup Safe Mode',
          destinationUrl: link.fallbackUrl,
          actionType: fallbackAction,
          isFallback: true,
          warmupBlocked: true,
          evaluationLatencyMs: elapsed,
          signals
        };
      }
    }

    // 2. 1-Click Datacenter ASN Firewall (Instantly drop AWS, GCP, Azure, DigitalOcean IPs)
    if (link.datacenterBlocked && signals.networkType === 'datacenter') {
      const elapsed = Math.round(performance.now() - startTime);
      return {
        matchedRuleId: null,
        matchedRuleName: 'Datacenter ASN Firewall Drop',
        destinationUrl: link.fallbackUrl,
        actionType: fallbackAction,
        isFallback: true,
        datacenterBlocked: true,
        evaluationLatencyMs: elapsed,
        signals
      };
    }

    // 3. 1-Click Spy Service Firewall (Instantly drop AdPlexity, SpyOver, Anstrex, Dropispy, etc.)
    if (link.blockSpyServices && signals.isSpyService) {
      const elapsed = Math.round(performance.now() - startTime);
      return {
        matchedRuleId: null,
        matchedRuleName: `Spy Service Block (${signals.spyServiceName || 'Ad Intelligence'})`,
        destinationUrl: link.fallbackUrl,
        actionType: fallbackAction,
        isFallback: true,
        evaluationLatencyMs: elapsed,
        signals
      };
    }

    // 4. 1-Click VPN / Proxy / Tor Firewall
    if (link.blockVpn && (signals.isVpn || signals.isTor)) {
      const elapsed = Math.round(performance.now() - startTime);
      return {
        matchedRuleId: null,
        matchedRuleName: `VPN / Proxy Firewall (${signals.vpnReason || 'VPN Detected'})`,
        destinationUrl: link.fallbackUrl,
        actionType: fallbackAction,
        isFallback: true,
        evaluationLatencyMs: elapsed,
        signals
      };
    }

    // 5. Global Threat Intelligence Check (Meta Dublin QA, Google Policy Scanners, TikTok QA, Custom Blacklists)
    const threatCheck = ThreatIntelligenceService.checkThreat(signals);
    if (threatCheck.isThreat) {
      const elapsed = Math.round(performance.now() - startTime);
      return {
        matchedRuleId: null,
        matchedRuleName: `Global Threat Defense (${threatCheck.matchedFeed || 'Blacklisted Threat'})`,
        destinationUrl: link.fallbackUrl,
        actionType: fallbackAction,
        isFallback: true,
        evaluationLatencyMs: elapsed,
        signals
      };
    }

    // 6. Stealth Traffic Ramp-Up Weight Calculation
    let rampFactor = 1.0;
    if (link.rampUpEnabled) {
      const rampStartTime = link.warmupUntil 
        ? new Date(link.warmupUntil).getTime() 
        : (link.createdAt ? new Date(link.createdAt).getTime() : now);
      
      const rampDurationHours = Math.max(1, link.rampUpDurationHours || 24);
      const rampDurationMs = rampDurationHours * 3600 * 1000;
      const timeSinceRampStart = now - rampStartTime;

      if (timeSinceRampStart >= 0 && timeSinceRampStart < rampDurationMs) {
        // Linear scale 10% -> 100% over the duration window
        rampFactor = 0.10 + (0.90 * (timeSinceRampStart / rampDurationMs));
        const roll = Math.random();
        if (roll > rampFactor) {
          const elapsed = Math.round(performance.now() - startTime);
          return {
            matchedRuleId: null,
            matchedRuleName: `Stealth Ramp-Up (${Math.round(rampFactor * 100)}%)`,
            destinationUrl: link.fallbackUrl,
            actionType: fallbackAction,
            isFallback: true,
            rampUpApplied: true,
            evaluationLatencyMs: elapsed,
            signals
          };
        }
      }
    }

    // Sort active rules by priority ascending (0 = highest priority)
    const activeRules = [...(link.rules || [])]
      .filter(r => r.isActive)
      .sort((a, b) => a.priority - b.priority);

    for (const rule of activeRules) {
      let conditions: RuleCondition[] = [];
      try {
        conditions = typeof rule.conditions === 'string' ? JSON.parse(rule.conditions) : (rule.conditions || []);
      } catch (e) {
        conditions = [];
      }

      // Check if ALL conditions match (AND logic)
      const allMatched = conditions.length === 0 || conditions.every(cond => this.evaluateCondition(cond, signals));

      if (allMatched) {
        // Weighted check if weight is specified (< 100)
        if (rule.weight !== undefined && rule.weight < 100) {
          const rand = Math.floor(Math.random() * 100) + 1;
          if (rand > rule.weight) {
            continue; // Skip this rule this time, let next rule or fallback handle
          }
        }

        const elapsed = Math.round(performance.now() - startTime);
        return {
          matchedRuleId: rule.id,
          matchedRuleName: rule.name,
          destinationUrl: rule.destinationUrl || (rule as any).targetUrl,
          actionType: (rule.actionType as any) || (rule as any).action || 'redirect_302',
          isFallback: false,
          evaluationLatencyMs: elapsed,
          signals
        };
      }
    }

    // No rule matched -> Fallback
    const elapsed = Math.round(performance.now() - startTime);
    return {
      matchedRuleId: null,
      matchedRuleName: null,
      destinationUrl: link.fallbackUrl,
      actionType: fallbackAction,
      isFallback: true,
      evaluationLatencyMs: elapsed,
      signals
    };
  }

  static evaluateCondition(cond: RuleCondition, signals: ExtractedSignals): boolean {
    let actualValue: any;

    switch (cond.type) {
      case 'geo_country':
        actualValue = signals.country;
        break;
      case 'geo_postal_code':
        actualValue = signals.postalCode;
        break;
      case 'geo_region':
        actualValue = signals.region;
        break;
      case 'geo_city':
        actualValue = signals.city;
        break;
      case 'geo_timezone':
        actualValue = signals.timezone;
        break;
      case 'device_type':
        actualValue = signals.deviceType;
        break;
      case 'os':
        actualValue = signals.os;
        break;
      case 'browser':
        actualValue = signals.browser;
        break;
      case 'bot_status':
        actualValue = signals.isBot ? 'bot' : 'human';
        break;
      case 'network_type':
        actualValue = signals.networkType;
        break;
      case 'asn_provider':
        actualValue = signals.asnOrg || signals.asn;
        break;
      case 'isp_provider':
        actualValue = signals.isp || signals.asnOrg || '';
        break;
      case 'spy_service': {
        const isSpy = Boolean(signals.isSpyService);
        const exp = String(cond.value || '').toLowerCase().trim();
        if (exp === 'false' || exp === 'clean' || exp === 'no' || exp === '0') {
          return cond.operator === 'equals' ? !isSpy : isSpy;
        }
        if (exp === 'true' || exp === 'detected' || exp === 'spy_detected' || exp === 'yes' || exp === '1') {
          return cond.operator === 'equals' ? isSpy : !isSpy;
        }
        actualValue = signals.spyServiceName || (isSpy ? 'spy_detected' : 'clean');
        break;
      }
      case 'vpn_status': {
        const isVpnOrTor = Boolean(signals.isVpn || signals.isTor);
        const exp = String(cond.value || '').toLowerCase().trim();
        if (exp === 'false' || exp === 'clean' || exp === 'no' || exp === 'residential') {
          return cond.operator === 'equals' ? !isVpnOrTor : isVpnOrTor;
        }
        if (exp === 'true' || exp === 'vpn' || exp === 'detected' || exp === 'yes') {
          return cond.operator === 'equals' ? isVpnOrTor : !isVpnOrTor;
        }
        if (exp === 'tor') {
          return cond.operator === 'equals' ? Boolean(signals.isTor) : !signals.isTor;
        }
        actualValue = signals.isTor ? 'tor' : (signals.isVpn ? 'vpn' : 'clean');
        break;
      }
      case 'timezone_delta': {
        const hasDelta = Boolean(signals.hasTimezoneDelta);
        const exp = String(cond.value || '').toLowerCase().trim();
        if (exp === 'false' || exp === 'match' || exp === 'clean' || exp === 'no') {
          return cond.operator === 'equals' ? !hasDelta : hasDelta;
        }
        if (exp === 'true' || exp === 'mismatch' || exp === 'delta' || exp === 'yes') {
          return cond.operator === 'equals' ? hasDelta : !hasDelta;
        }
        actualValue = hasDelta ? 'mismatch' : 'match';
        break;
      }
      case 'threat_list': {
        const threatCheck = ThreatIntelligenceService.checkThreat(signals);
        const isThreat = Boolean(threatCheck.isThreat || signals.isBot || signals.isSpyService || signals.isTor || signals.networkType === 'datacenter');
        const exp = String(cond.value || '').toLowerCase().trim();
        if (exp === 'clean' || exp === 'false' || exp === 'safe') {
          return cond.operator === 'equals' ? !isThreat : isThreat;
        }
        if (exp === 'threat' || exp === 'threat_detected' || exp === 'true' || exp === 'blocked') {
          return cond.operator === 'equals' ? isThreat : !isThreat;
        }
        actualValue = isThreat ? 'threat_detected' : 'clean';
        break;
      }
      case 'touch_support':
        actualValue = signals.touchPoints !== undefined ? signals.touchPoints > 0 : (signals.deviceType === 'mobile');
        break;
      case 'gpu_renderer':
        actualValue = signals.gpuRenderer || 'hardware_gpu';
        break;
      case 'battery_valid':
        actualValue = signals.batteryLevel !== undefined ? signals.batteryLevel < 1.0 : true;
        break;
      case 'language':
        actualValue = signals.language;
        break;
      case 'referrer':
        actualValue = signals.referrer;
        break;
      case 'sec_ch_ua':
        actualValue = signals.headers['sec-ch-ua'] || signals.headers['sec-ch-ua-mobile'] || '';
        break;
      case 'ip_address':
        actualValue = signals.ipAddress;
        break;
      case 'header':
        if (!cond.key) return false;
        actualValue = signals.headers[cond.key.toLowerCase()];
        break;
      case 'query_param':
        if (!cond.key) return false;
        actualValue = signals.queryParams[cond.key];
        break;
      default:
        return false;
    }

    return this.compare(actualValue, cond.operator, cond.value);
  }

  private static compare(actual: any, operator: string, expected: any): boolean {
    const normalize = (val: any): string => {
      if (val === undefined || val === null) return '';
      if (typeof val === 'boolean') return val ? 'true' : 'false';
      const str = String(val).toLowerCase().trim();
      if (str === 'yes' || str === '1') return 'true';
      if (str === 'no' || str === '0') return 'false';
      return str;
    };

    const actStr = normalize(actual);
    const expStr = normalize(expected);

    switch (operator) {
      case 'equals': {
        if (expStr.includes(',')) {
          const list = expStr.split(',').map(x => normalize(x));
          return list.includes(actStr);
        }
        return actStr === expStr;
      }
      case 'not_equals': {
        if (expStr.includes(',')) {
          const list = expStr.split(',').map(x => normalize(x));
          return !list.includes(actStr);
        }
        return actStr !== expStr;
      }
      case 'starts_with':
        return actStr.startsWith(expStr.replace(/\*$/, ''));
      case 'contains':
        return actStr.includes(expStr);
      case 'not_contains':
        return !actStr.includes(expStr);
      case 'in': {
        const list = Array.isArray(expected) 
          ? expected.map(x => normalize(x))
          : expStr.split(',').map(x => normalize(x));
        return list.some(item => {
          if (item.endsWith('*')) {
            return actStr.startsWith(item.replace(/\*$/, ''));
          }
          return item === actStr;
        });
      }
      case 'not_in': {
        const list = Array.isArray(expected) 
          ? expected.map(x => normalize(x))
          : expStr.split(',').map(x => normalize(x));
        return !list.some(item => {
          if (item.endsWith('*')) {
            return actStr.startsWith(item.replace(/\*$/, ''));
          }
          return item === actStr;
        });
      }
      case 'regex':
        try {
          const regex = new RegExp(expected, 'i');
          return regex.test(actStr);
        } catch {
          return false;
        }
      case 'exists':
        return actual !== undefined && actual !== null && actStr !== '';
      case 'not_exists':
        return actual === undefined || actual === null || actStr === '';
      default:
        return false;
    }
  }
}
