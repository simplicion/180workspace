import { prisma, requestContext } from '@workspace/db';
import { DecisionEngine } from '../evaluator/decision-engine';
import { SignalExtractor } from '../evaluator/signal-extractor';
import { ExtractedSignals, RuleCondition } from '../types';

export interface SimulationInput {
  linkId: string;
  simulatedIp?: string;
  simulatedCountry?: string;
  simulatedCity?: string;
  simulatedUserAgent?: string;
  simulatedReferrer?: string;
  simulatedNetworkType?: 'residential' | 'datacenter' | 'cellular' | 'vpn';
  simulatedAsnOrg?: string;
  simulatedIsp?: string;
  simulatedIsSpyService?: boolean;
  simulatedSpyServiceName?: string;
  simulatedIsVpn?: boolean;
  simulatedIsTor?: boolean;
  simulatedClientTimezone?: string;
  simulatedTimezone?: string;
  simulatedHasTimezoneDelta?: boolean;
  simulatedTouchPoints?: number;
  simulatedGpuRenderer?: string;
  simulatedBatteryLevel?: number;
  simulatedHeaders?: Record<string, string>;
  simulatedQueryParams?: Record<string, string>;
}

const db = prisma as any;

export class TrafficSimulatorService {
  private static resolveCompanyId(providedCompanyId?: string): string | undefined {
    return providedCompanyId || requestContext.getStore()?.companyId;
  }

  static async simulate(companyId: string | undefined, input: SimulationInput) {
    const effectiveCompanyId = this.resolveCompanyId(companyId);
    const where: any = { id: input.linkId };
    if (effectiveCompanyId) {
      where.companyId = effectiveCompanyId;
    }

    const link = await db.trafficLink.findFirst({
      where,
      include: {
        rules: {
          orderBy: { priority: 'asc' }
        }
      }
    });

    if (!link) {
      throw new Error('Traffic link not found or unauthorized');
    }

    const ua = input.simulatedUserAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
    const { deviceType, os, browser } = SignalExtractor.parseClientCharacteristics(ua);

    // Bot check
    const isBot = /bot|crawl|spider|slurp|facebook|twitter|curl|wget/i.test(ua) || input.simulatedNetworkType === 'datacenter';

    let isEmulated = false;
    const touchPoints = input.simulatedTouchPoints !== undefined ? input.simulatedTouchPoints : (deviceType === 'mobile' ? 5 : 0);
    const gpuRenderer = input.simulatedGpuRenderer || 'NVIDIA GeForce RTX 4080';
    if (/swiftshader|llvmpipe|software rasterizer|virtualbox/i.test(gpuRenderer) || (deviceType === 'mobile' && touchPoints === 0)) {
      isEmulated = true;
    }

    const isTor = Boolean(input.simulatedIsTor);
    const isSpyService = Boolean(input.simulatedIsSpyService);
    const hasTimezoneDelta = Boolean(
      input.simulatedHasTimezoneDelta || 
      (input.simulatedClientTimezone && input.simulatedTimezone && input.simulatedClientTimezone !== input.simulatedTimezone)
    );
    const isVpn = Boolean(input.simulatedIsVpn || isTor || hasTimezoneDelta);

    const signals: ExtractedSignals = {
      ipAddress: input.simulatedIp || '198.51.100.1',
      country: (input.simulatedCountry || 'US').toUpperCase(),
      city: input.simulatedCity || 'New York',
      deviceType,
      os,
      browser,
      userAgent: ua,
      referrer: input.simulatedReferrer || '',
      isBot,
      botName: isBot ? 'SimulatedBot' : undefined,
      language: 'en',
      networkType: input.simulatedNetworkType || (isVpn ? 'vpn' : 'residential'),
      asnOrg: input.simulatedAsnOrg || (input.simulatedNetworkType === 'datacenter' ? 'AWS' : undefined),
      isp: input.simulatedIsp || (input.simulatedAsnOrg ? SignalExtractor.normalizeIspName(input.simulatedAsnOrg) : undefined),
      isSpyService,
      spyServiceName: isSpyService ? (input.simulatedSpyServiceName || 'AdPlexity') : undefined,
      isVpn,
      isTor,
      vpnReason: isTor ? 'tor_exit_node' : (hasTimezoneDelta ? 'timezone_mismatch' : (isVpn ? 'commercial_vpn' : undefined)),
      clientTimezone: input.simulatedClientTimezone,
      timezone: input.simulatedTimezone,
      hasTimezoneDelta,
      touchPoints,
      gpuRenderer,
      batteryLevel: input.simulatedBatteryLevel !== undefined ? input.simulatedBatteryLevel : 0.85,
      isEmulated,
      headers: input.simulatedHeaders || {},
      queryParams: input.simulatedQueryParams || {},
      timestamp: new Date()
    };

    const evaluation = DecisionEngine.evaluate(
      {
        id: link.id,
        fallbackUrl: link.fallbackUrl,
        isActive: link.isActive,
        warmupUntil: link.warmupUntil,
        rampUpEnabled: link.rampUpEnabled,
        rampUpDurationHours: link.rampUpDurationHours,
        datacenterBlocked: link.datacenterBlocked,
        blockSpyServices: link.tags?.includes('block_spy') ?? true,
        blockVpn: link.tags?.includes('block_vpn') ?? true,
        rules: link.rules
      },
      signals
    );

    // Trace detailed step-by-step evaluation for user inspection
    const ruleAudit = link.rules.map(rule => {
      let conditions: RuleCondition[] = [];
      try {
        conditions = typeof rule.conditions === 'string' ? JSON.parse(rule.conditions) : (rule.conditions || []);
      } catch (e) {
        conditions = [];
      }

      const conditionResults = conditions.map(cond => ({
        condition: cond,
        matched: DecisionEngine.evaluateCondition(cond, signals)
      }));

      const allConditionsPassed = conditionResults.length === 0 || conditionResults.every(c => c.matched);
      const isSelected = rule.id === evaluation.matchedRuleId;

      return {
        ruleId: rule.id,
        ruleName: rule.name,
        priority: rule.priority,
        isActive: rule.isActive,
        destinationUrl: rule.destinationUrl,
        conditions: conditionResults,
        allConditionsPassed,
        isSelected
      };
    });

    return {
      simulationResult: evaluation,
      extractedSignals: signals,
      ruleAudit,
      link: {
        id: link.id,
        name: link.name,
        slug: link.slug,
        fallbackUrl: link.fallbackUrl,
        isActive: link.isActive
      }
    };
  }
}
