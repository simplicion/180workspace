import { prisma, requestContext } from '@workspace/db';
import { EvaluationResult, ExtractedSignals } from '../types';

const db = prisma as any;

export class TrafficAnalyticsService {
  private static resolveCompanyId(providedCompanyId?: string): string | undefined {
    return providedCompanyId || requestContext.getStore()?.companyId;
  }

  static async recordTrafficLog(linkId: string, result: EvaluationResult, signals: ExtractedSignals) {
    try {
      // 1. Create log record
      const log = await db.trafficLog.create({
        data: {
          linkId,
          ruleId: result.matchedRuleId,
          ipAddress: signals.ipAddress,
          country: signals.country,
          city: signals.city,
          deviceType: signals.deviceType,
          os: signals.os,
          browser: signals.browser,
          userAgent: signals.userAgent,
          referrer: signals.referrer,
          isBot: signals.isBot,
          botName: signals.botName || null,
          networkType: signals.networkType || 'residential',
          gpuRenderer: signals.gpuRenderer || null,
          touchPoints: signals.touchPoints !== undefined ? signals.touchPoints : null,
          batteryLevel: signals.batteryLevel !== undefined ? signals.batteryLevel : null,
          isEmulated: signals.isEmulated || false,
          destinationUrl: result.destinationUrl,
          responseStatus: result.actionType === 'redirect_301' ? 301 : (result.actionType === 'redirect_307' ? 307 : 302),
          latencyMs: result.evaluationLatencyMs
        }
      });

      // 2. Increment click counters
      await db.trafficLink.update({
        where: { id: linkId },
        data: { totalClicks: { increment: 1 } }
      });

      if (result.matchedRuleId) {
        await db.trafficRule.update({
          where: { id: result.matchedRuleId },
          data: { matchCount: { increment: 1 } }
        });
      }

      return log;
    } catch (error) {
      console.error('[TrafficAnalyticsService] Error recording traffic log:', error);
      return null;
    }
  }

  static async getOverviewStats(companyId?: string) {
    const effectiveCompanyId = this.resolveCompanyId(companyId);
    const where: any = {};
    if (effectiveCompanyId) {
      where.companyId = effectiveCompanyId;
    }

    const totalLinks = await db.trafficLink.count({ where });

    const activeLinks = await db.trafficLink.count({
      where: { ...where, isActive: true }
    });

    const links = await db.trafficLink.findMany({
      where,
      select: { id: true, totalClicks: true, warmupUntil: true }
    });

    const linkIds = links.map((l: any) => l.id);
    const totalClicks = links.reduce((sum: number, l: any) => sum + (l.totalClicks || 0), 0);

    if (linkIds.length === 0) {
      return {
        totalLinks: 0,
        activeLinks: 0,
        totalRequests: 0,
        totalHumans: 0,
        totalBots: 0,
        totalDatacenter: 0,
        botRatio: 0,
        avgLatencyMs: 0,
        anomalyDetected: false,
        anomalyMessage: null,
        topCountries: [],
        topDevices: [],
        recentLogs: []
      };
    }

    const [botCount, humanCount, datacenterCount, totalLogs, countryAgg, deviceAgg, recentLogs] = await Promise.all([
      db.trafficLog.count({
        where: { linkId: { in: linkIds }, isBot: true }
      }),
      db.trafficLog.count({
        where: { linkId: { in: linkIds }, isBot: false }
      }),
      db.trafficLog.count({
        where: { linkId: { in: linkIds }, networkType: 'datacenter' }
      }),
      db.trafficLog.count({
        where: { linkId: { in: linkIds } }
      }),
      db.trafficLog.groupBy({
        by: ['country'],
        where: { linkId: { in: linkIds }, country: { not: null } },
        _count: { country: true },
        orderBy: { _count: { country: 'desc' } },
        take: 5
      }),
      db.trafficLog.groupBy({
        by: ['deviceType'],
        where: { linkId: { in: linkIds }, deviceType: { not: null } },
        _count: { deviceType: true },
        orderBy: { _count: { deviceType: 'desc' } },
        take: 5
      }),
      db.trafficLog.findMany({
        where: { linkId: { in: linkIds } },
        orderBy: { timestamp: 'desc' },
        take: 15,
        include: {
          link: {
            select: { name: true, slug: true }
          }
        }
      })
    ]);

    const botRatio = totalLogs > 0 ? Math.round((botCount / totalLogs) * 100) : 0;
    const datacenterRatio = totalLogs > 0 ? Math.round((datacenterCount / totalLogs) * 100) : 0;

    // Anomaly Detection: Flag if datacenter/bot traffic surges above 60%
    const anomalyDetected = totalLogs >= 20 && (botRatio > 60 || datacenterRatio > 50);
    const anomalyMessage = anomalyDetected
      ? `Traffic Anomaly Alert: ${botRatio}% of recent traffic originates from automated bots / datacenter ASNs.`
      : null;

    return {
      totalLinks,
      activeLinks,
      totalRequests: totalLogs || totalClicks,
      totalHumans: humanCount,
      totalBots: botCount,
      totalDatacenter: datacenterCount,
      botRatio,
      datacenterRatio,
      anomalyDetected,
      anomalyMessage,
      topCountries: countryAgg.map((c: any) => ({ country: c.country || 'Unknown', count: c._count.country })),
      topDevices: deviceAgg.map((d: any) => ({ device: d.deviceType || 'unknown', count: d._count.deviceType })),
      recentLogs
    };
  }

  static async getLogs(companyId?: string, options: { linkId?: string; isBot?: boolean; page?: number; limit?: number } = {}) {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    const effectiveCompanyId = this.resolveCompanyId(companyId);
    const where: any = {};

    if (effectiveCompanyId) {
      where.link = { companyId: effectiveCompanyId };
    }

    if (options.linkId) {
      where.linkId = options.linkId;
    }

    if (options.isBot !== undefined) {
      where.isBot = options.isBot;
    }

    const [logs, total] = await Promise.all([
      db.trafficLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
        include: {
          link: {
            select: { name: true, slug: true, fallbackUrl: true }
          }
        }
      }),
      db.trafficLog.count({ where })
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}
