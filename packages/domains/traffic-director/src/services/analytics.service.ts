import { prisma, requestContext } from '@workspace/db';
import { paginateWithCursor, extractPaginationParams } from '@workspace/backend-infra';
import { 
  EvaluationResult, 
  ExtractedSignals, 
  TrafficAnalyticsQueryOptions, 
  LinkAnalyticsResponse,
  TrafficAnalyticsKPIs,
  TrafficTimeseriesPoint,
  TrafficCloakingReason,
  TrafficCountryStat,
  TrafficBreakdownItem,
  AnalyticsTimeRange
} from '../types';

const db = prisma as any;

const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  CA: 'Canada',
  AU: 'Australia',
  DE: 'Germany',
  FR: 'France',
  IN: 'India',
  BR: 'Brazil',
  IT: 'Italy',
  ES: 'Spain',
  NL: 'Netherlands',
  MX: 'Mexico',
  JP: 'Japan',
  SG: 'Singapore',
  AE: 'United Arab Emirates',
  SE: 'Sweden',
  CH: 'Switzerland',
  NZ: 'New Zealand',
  ZA: 'South Africa',
  PH: 'Philippines',
  ID: 'Indonesia',
  VN: 'Vietnam',
  PK: 'Pakistan',
  NG: 'Nigeria',
  KE: 'Kenya',
  EG: 'Egypt',
  SA: 'Saudi Arabia',
  TR: 'Turkey',
  PL: 'Poland',
  BE: 'Belgium',
  AT: 'Austria',
  IE: 'Ireland',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  PT: 'Portugal',
  GR: 'Greece',
  CZ: 'Czech Republic',
  RO: 'Romania',
  HU: 'Hungary',
  IL: 'Israel',
  TH: 'Thailand',
  MY: 'Malaysia',
  KR: 'South Korea',
  HK: 'Hong Kong',
  TW: 'Taiwan',
  AR: 'Argentina',
  CO: 'Colombia',
  CL: 'Chile',
  PE: 'Peru',
  UA: 'Ukraine',
};

function getCountryFlag(code?: string | null): string {
  if (!code || typeof code !== 'string' || code.length !== 2) return '🌐';
  const upper = code.toUpperCase();
  if (upper === 'XX' || upper === 'UN') return '🌐';
  try {
    return String.fromCodePoint(...[...upper].map(c => 127397 + c.charCodeAt(0)));
  } catch {
    return '🌐';
  }
}

function getCountryName(code?: string | null): string {
  if (!code || typeof code !== 'string') return 'Unknown';
  const upper = code.toUpperCase();
  return COUNTRY_NAMES[upper] || upper;
}

function computeDateRange(timeRange: AnalyticsTimeRange = 'today', customStart?: string | Date, customEnd?: string | Date) {
  const now = new Date();
  let start: Date;
  let end: Date = new Date(now);

  let prevStart: Date;
  let prevEnd: Date;

  switch (timeRange) {
    case 'today': {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const diffMs = end.getTime() - start.getTime();
      prevEnd = new Date(start.getTime() - 1);
      prevStart = new Date(prevEnd.getTime() - diffMs);
      break;
    }
    case 'yesterday': {
      const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0, 0);
      end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
      
      const dayBefore = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() - 1);
      prevStart = new Date(dayBefore.getFullYear(), dayBefore.getMonth(), dayBefore.getDate(), 0, 0, 0, 0);
      prevEnd = new Date(dayBefore.getFullYear(), dayBefore.getMonth(), dayBefore.getDate(), 23, 59, 59, 999);
      break;
    }
    case '24h': {
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      prevEnd = new Date(start.getTime());
      prevStart = new Date(prevEnd.getTime() - 24 * 60 * 60 * 1000);
      break;
    }
    case '7d': {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      prevEnd = new Date(start.getTime());
      prevStart = new Date(prevEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    }
    case '30d': {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      prevEnd = new Date(start.getTime());
      prevStart = new Date(prevEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    }
    case 'this_month': {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const diffMs = end.getTime() - start.getTime();
      prevEnd = new Date(start.getTime() - 1);
      prevStart = new Date(prevEnd.getTime() - diffMs);
      break;
    }
    case 'all': {
      start = new Date(0); // All time from epoch
      end = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      prevStart = new Date(0);
      prevEnd = new Date(0);
      break;
    }
    case 'custom': {
      start = customStart ? new Date(customStart) : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      end = customEnd ? new Date(customEnd) : new Date(now);
      const diffMs = Math.max(end.getTime() - start.getTime(), 60000);
      prevEnd = new Date(start.getTime() - 1);
      prevStart = new Date(prevEnd.getTime() - diffMs);
      break;
    }
    default: {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const diffMs = end.getTime() - start.getTime();
      prevEnd = new Date(start.getTime() - 1);
      prevStart = new Date(prevEnd.getTime() - diffMs);
      break;
    }
  }

  return { start, end, prevStart, prevEnd };
}

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
          botName: result.matchedRuleName || signals.botName || (result.isFallback ? 'Fallback Safe Page' : null),
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

  /**
   * Comprehensive Link-Specific Analytics Suite
   */
  static async getLinkAnalytics(
    companyId: string | undefined,
    linkId: string,
    options: TrafficAnalyticsQueryOptions = {}
  ): Promise<LinkAnalyticsResponse> {
    const effectiveCompanyId = this.resolveCompanyId(companyId);
    
    // 1. Validate Link Existence & Ownership
    const linkWhere: any = { id: linkId };
    if (effectiveCompanyId) {
      linkWhere.companyId = effectiveCompanyId;
    }

    const link = await db.trafficLink.findFirst({
      where: linkWhere,
      include: {
        rules: { orderBy: { priority: 'asc' } }
      }
    });

    if (!link) {
      throw new Error('Traffic link not found or unauthorized');
    }

    const fallbackUrl = link.fallbackUrl || '';
    const { timeRange = 'today', startDate, endDate, country, routingAction, isBot, deviceType } = options;
    const { start, end, prevStart, prevEnd } = computeDateRange(timeRange, startDate, endDate);

    // 2. Build parameterized SQL condition
    let whereSql = `WHERE "linkId" = $1`;
    const sqlParams: any[] = [linkId];
    let paramIdx = 2;

    if (timeRange !== 'all') {
      whereSql += ` AND "timestamp" >= $${paramIdx++} AND "timestamp" <= $${paramIdx++}`;
      sqlParams.push(start, end);
    }

    if (country) {
      whereSql += ` AND LOWER("country") = LOWER($${paramIdx++})`;
      sqlParams.push(country);
    }

    if (deviceType) {
      whereSql += ` AND LOWER("deviceType") = LOWER($${paramIdx++})`;
      sqlParams.push(deviceType);
    }

    if (isBot !== undefined) {
      whereSql += ` AND "isBot" = $${paramIdx++}`;
      sqlParams.push(isBot);
    }

    if (routingAction === 'target_offer') {
      whereSql += ` AND "destinationUrl" != $${paramIdx++} AND "isBot" = false`;
      sqlParams.push(fallbackUrl);
    } else if (routingAction === 'safe_page') {
      whereSql += ` AND "destinationUrl" = $${paramIdx++}`;
      sqlParams.push(fallbackUrl);
    } else if (routingAction === 'bot') {
      whereSql += ` AND "isBot" = true`;
    } else if (routingAction === 'datacenter') {
      whereSql += ` AND "networkType" = 'datacenter'`;
    }

    const isHourly = ['today', 'yesterday', '24h'].includes(timeRange) || (end.getTime() - start.getTime() <= 36 * 3600 * 1000);
    const timeFormat = isHourly ? 'YYYY-MM-DD"T"HH24' : 'YYYY-MM-DD';

    const fallbackIdx = `$${paramIdx}`;
    const allSqlParams = [...sqlParams, fallbackUrl];

    // 3. Ultra-Fast Parallel Database Aggregation
    const [
      kpiRows,
      prevKpiRows,
      timeseriesRows,
      countryRows,
      deviceRows,
      osRows,
      browserRows,
      referrerRows,
      cloakingRows
    ] = await Promise.all([
      // 1. Current Period KPIs
      db.$queryRawUnsafe(`
        SELECT 
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE "destinationUrl" != ${fallbackIdx} AND "isBot" = false)::int as target_views,
          COUNT(*) FILTER (WHERE "destinationUrl" = ${fallbackIdx} OR "isBot" = true)::int as safe_views,
          COUNT(*) FILTER (WHERE "isBot" = true)::int as bot_views,
          COUNT(*) FILTER (WHERE "networkType" = 'datacenter')::int as datacenter_views,
          COALESCE(AVG("latencyMs"), 0)::int as avg_latency
        FROM "TrafficLog"
        ${whereSql}
      `, ...allSqlParams) as Promise<any[]>,

      // 2. Previous Period KPIs (for comparison deltas)
      (timeRange === 'all' || !prevStart || !prevEnd) ? Promise.resolve([]) : db.$queryRawUnsafe(`
        SELECT 
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE "destinationUrl" != $2 AND "isBot" = false)::int as target_views,
          COUNT(*) FILTER (WHERE "isBot" = true)::int as bot_views
        FROM "TrafficLog"
        WHERE "linkId" = $1 AND "timestamp" >= $3 AND "timestamp" <= $4
      `, linkId, fallbackUrl, prevStart, prevEnd) as Promise<any[]>,

      // 3. Timeseries
      db.$queryRawUnsafe(`
        SELECT 
          TO_CHAR("timestamp", '${timeFormat}') as bucket,
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE "destinationUrl" != ${fallbackIdx} AND "isBot" = false)::int as target,
          COUNT(*) FILTER (WHERE "destinationUrl" = ${fallbackIdx} OR "isBot" = true)::int as safe,
          COUNT(*) FILTER (WHERE "isBot" = true)::int as bot,
          COUNT(*) FILTER (WHERE "networkType" = 'datacenter')::int as datacenter
        FROM "TrafficLog"
        ${whereSql}
        GROUP BY TO_CHAR("timestamp", '${timeFormat}')
        ORDER BY bucket ASC
      `, ...allSqlParams) as Promise<any[]>,

      // 4. Country Breakdown
      db.$queryRawUnsafe(`
        SELECT 
          COALESCE("country", 'XX') as code,
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE "destinationUrl" != ${fallbackIdx} AND "isBot" = false)::int as target,
          COUNT(*) FILTER (WHERE "destinationUrl" = ${fallbackIdx} OR "isBot" = true)::int as safe
        FROM "TrafficLog"
        ${whereSql}
        GROUP BY "country"
        ORDER BY total DESC
        LIMIT 20
      `, ...allSqlParams) as Promise<any[]>,

      // 5. Devices
      db.$queryRawUnsafe(`
        SELECT 
          COALESCE("deviceType", 'desktop') as name,
          COUNT(*)::int as count
        FROM "TrafficLog"
        ${whereSql}
        GROUP BY "deviceType"
        ORDER BY count DESC
      `, ...sqlParams) as Promise<any[]>,

      // 6. OS
      db.$queryRawUnsafe(`
        SELECT 
          COALESCE("os", 'Unknown OS') as name,
          COUNT(*)::int as count
        FROM "TrafficLog"
        ${whereSql}
        GROUP BY "os"
        ORDER BY count DESC
        LIMIT 10
      `, ...sqlParams) as Promise<any[]>,

      // 7. Browsers
      db.$queryRawUnsafe(`
        SELECT 
          COALESCE("browser", 'Unknown Browser') as name,
          COUNT(*)::int as count
        FROM "TrafficLog"
        ${whereSql}
        GROUP BY "browser"
        ORDER BY count DESC
        LIMIT 10
      `, ...sqlParams) as Promise<any[]>,

      // 8. Referrers
      db.$queryRawUnsafe(`
        SELECT 
          COALESCE("referrer", 'Direct / None') as name,
          COUNT(*)::int as count
        FROM "TrafficLog"
        ${whereSql}
        GROUP BY "referrer"
        ORDER BY count DESC
        LIMIT 10
      `, ...sqlParams) as Promise<any[]>,

      // 9. Cloaking Reasons
      db.$queryRawUnsafe(`
        SELECT
          COUNT(*) FILTER (WHERE "destinationUrl" != ${fallbackIdx} AND "isBot" = false)::int as target_rule,
          COUNT(*) FILTER (WHERE "isBot" = true)::int as bot_crawler,
          COUNT(*) FILTER (WHERE "networkType" = 'datacenter')::int as datacenter_asn,
          COUNT(*) FILTER (WHERE "isEmulated" = true)::int as emulated_device,
          COUNT(*) FILTER (WHERE "destinationUrl" = ${fallbackIdx} AND "isBot" = false AND "networkType" != 'datacenter' AND "isEmulated" != true)::int as fallback_default
        FROM "TrafficLog"
        ${whereSql}
      `, ...allSqlParams) as Promise<any[]>
    ]);

    // Format KPIs
    const kpi = kpiRows[0] || { total: 0, target_views: 0, safe_views: 0, bot_views: 0, datacenter_views: 0, avg_latency: 0 };
    const totalViews = kpi.total || 0;
    const targetViews = kpi.target_views || 0;
    const safeViews = kpi.safe_views || 0;
    const botViews = kpi.bot_views || 0;
    const datacenterViews = kpi.datacenter_views || 0;
    const avgLatencyMs = kpi.avg_latency || 0;

    const targetRate = totalViews > 0 ? Math.round((targetViews / totalViews) * 1000) / 10 : 0;
    const botRate = totalViews > 0 ? Math.round((botViews / totalViews) * 1000) / 10 : 0;
    const datacenterRate = totalViews > 0 ? Math.round((datacenterViews / totalViews) * 1000) / 10 : 0;

    // Previous period deltas
    const prevKpi = prevKpiRows[0] || null;
    const prevTotal = prevKpi?.total || 0;
    const prevTarget = prevKpi?.target_views || 0;
    const prevBot = prevKpi?.bot_views || 0;
    const prevTargetRate = prevTotal > 0 ? (prevTarget / prevTotal) * 100 : 0;
    const prevBotRate = prevTotal > 0 ? (prevBot / prevTotal) * 100 : 0;

    const viewsDeltaPct = prevTotal > 0 
      ? Math.round(((totalViews - prevTotal) / prevTotal) * 1000) / 10 
      : (totalViews > 0 ? 100 : 0);

    const targetViewsDeltaPct = prevTarget > 0 
      ? Math.round(((targetViews - prevTarget) / prevTarget) * 1000) / 10 
      : (targetViews > 0 ? 100 : 0);

    const targetRateDeltaPct = Math.round((targetRate - prevTargetRate) * 10) / 10;
    const botRateDeltaPct = Math.round((botRate - prevBotRate) * 10) / 10;

    const kpis: TrafficAnalyticsKPIs = {
      totalViews,
      targetViews,
      safeViews,
      targetRate,
      botViews,
      botRate,
      datacenterViews,
      datacenterRate,
      avgLatencyMs,
      viewsDeltaPct,
      targetViewsDeltaPct,
      safeViewsDeltaPct: null,
      targetRateDeltaPct,
      botRateDeltaPct
    };

    // Format Timeseries
    const tsBucketMap = new Map<string, any>();
    for (const r of timeseriesRows) {
      tsBucketMap.set(r.bucket, r);
    }

    const timeseriesMap = new Map<string, TrafficTimeseriesPoint>();
    if (isHourly) {
      const cursor = new Date(start);
      while (cursor <= end) {
        const year = cursor.getUTCFullYear();
        const month = String(cursor.getUTCMonth() + 1).padStart(2, '0');
        const day = String(cursor.getUTCDate()).padStart(2, '0');
        const hour = String(cursor.getUTCHours()).padStart(2, '0');
        const hourStr = `${year}-${month}-${day}T${hour}`;
        const label = `${hour}:00`;
        const existing = tsBucketMap.get(hourStr);

        timeseriesMap.set(hourStr, {
          time: hourStr,
          timestamp: cursor.getTime(),
          label,
          total: existing?.total || 0,
          target: existing?.target || 0,
          safe: existing?.safe || 0,
          bot: existing?.bot || 0,
          datacenter: existing?.datacenter || 0
        });
        cursor.setUTCHours(cursor.getUTCHours() + 1);
      }
    } else {
      let effectiveStartDay: Date;
      if (timeRange === 'all' && timeseriesRows.length > 0) {
        effectiveStartDay = new Date(timeseriesRows[0].bucket + 'T00:00:00.000Z');
      } else if (start.getUTCFullYear() < 2020) {
        effectiveStartDay = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      } else {
        effectiveStartDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
      }

      const cursor = new Date(effectiveStartDay);
      const endDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
      while (cursor <= endDay) {
        const year = cursor.getUTCFullYear();
        const month = String(cursor.getUTCMonth() + 1).padStart(2, '0');
        const day = String(cursor.getUTCDate()).padStart(2, '0');
        const dayStr = `${year}-${month}-${day}`;
        const label = cursor.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' });
        const existing = tsBucketMap.get(dayStr);

        timeseriesMap.set(dayStr, {
          time: dayStr,
          timestamp: cursor.getTime(),
          label,
          total: existing?.total || 0,
          target: existing?.target || 0,
          safe: existing?.safe || 0,
          bot: existing?.bot || 0,
          datacenter: existing?.datacenter || 0
        });
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    }

    const timeseries = Array.from(timeseriesMap.values());

    // Format Cloaking Reasons
    const cr = cloakingRows[0] || {};
    const cloakingReasons: TrafficCloakingReason[] = [
      {
        reasonKey: 'bot_crawler',
        label: 'Automated Bot / Crawler Scraper',
        description: 'Known crawlers, search spiders, and automated scanners detected',
        count: cr.bot_crawler || 0,
        percentage: totalViews > 0 ? Math.round(((cr.bot_crawler || 0) / totalViews) * 1000) / 10 : 0,
        category: 'blocked' as const,
        color: '#ef4444'
      },
      {
        reasonKey: 'target_rule',
        label: 'Target Offer (Rule Matched)',
        description: 'Qualified human visitors routed to target landing page',
        count: cr.target_rule || 0,
        percentage: totalViews > 0 ? Math.round(((cr.target_rule || 0) / totalViews) * 1000) / 10 : 0,
        category: 'target' as const,
        color: '#10b981'
      },
      {
        reasonKey: 'fallback_default',
        label: 'Default Safe Page Fallback',
        description: 'Non-matching human visitors served default compliant origin',
        count: cr.fallback_default || 0,
        percentage: totalViews > 0 ? Math.round(((cr.fallback_default || 0) / totalViews) * 1000) / 10 : 0,
        category: 'safe' as const,
        color: '#6366f1'
      },
      {
        reasonKey: 'datacenter_asn',
        label: 'Datacenter ASN Firewall Drop',
        description: 'Cloud hosting proxy subnets (AWS, GCP, Meta, Azure, Hetzner) blocked',
        count: cr.datacenter_asn || 0,
        percentage: totalViews > 0 ? Math.round(((cr.datacenter_asn || 0) / totalViews) * 1000) / 10 : 0,
        category: 'safe' as const,
        color: '#f43f5e'
      },
      {
        reasonKey: 'emulated_device',
        label: 'Emulated Device / Client Hints Mismatch',
        description: 'SwiftShader software GPU or User-Agent spoofing unmasked',
        count: cr.emulated_device || 0,
        percentage: totalViews > 0 ? Math.round(((cr.emulated_device || 0) / totalViews) * 1000) / 10 : 0,
        category: 'blocked' as const,
        color: '#ec4899'
      }
    ].filter(r => r.count > 0 || totalViews === 0).sort((a, b) => b.count - a.count);

    // Format Countries
    const countryDistribution: TrafficCountryStat[] = countryRows.map((r: any) => ({
      code: (r.code || 'XX').toUpperCase(),
      name: getCountryName(r.code),
      flag: getCountryFlag(r.code),
      total: r.total,
      target: r.target,
      safe: r.safe,
      targetRatePct: r.total > 0 ? Math.round((r.target / r.total) * 1000) / 10 : 0,
      percentage: totalViews > 0 ? Math.round((r.total / totalViews) * 1000) / 10 : 0
    }));

    // Format Device, OS, Browser, Referrer Breakdowns
    const deviceBreakdown: TrafficBreakdownItem[] = deviceRows.map((r: any) => ({
      name: r.name ? r.name.charAt(0).toUpperCase() + r.name.slice(1) : 'Desktop',
      count: r.count,
      percentage: totalViews > 0 ? Math.round((r.count / totalViews) * 1000) / 10 : 0
    }));

    const osBreakdown: TrafficBreakdownItem[] = osRows.map((r: any) => ({
      name: r.name || 'Unknown OS',
      count: r.count,
      percentage: totalViews > 0 ? Math.round((r.count / totalViews) * 1000) / 10 : 0
    }));

    const browserBreakdown: TrafficBreakdownItem[] = browserRows.map((r: any) => ({
      name: r.name || 'Unknown Browser',
      count: r.count,
      percentage: totalViews > 0 ? Math.round((r.count / totalViews) * 1000) / 10 : 0
    }));

    const referrerBreakdown: TrafficBreakdownItem[] = referrerRows.map((r: any) => ({
      name: r.name || 'Direct / None',
      count: r.count,
      percentage: totalViews > 0 ? Math.round((r.count / totalViews) * 1000) / 10 : 0
    }));

    const asnBreakdown: TrafficBreakdownItem[] = [
      { name: 'Residential', count: totalViews - datacenterViews - botViews, percentage: totalViews > 0 ? Math.round(((totalViews - datacenterViews - botViews) / totalViews) * 1000) / 10 : 0 },
      { name: 'Datacenter / Cloud', count: datacenterViews, percentage: datacenterRate },
      { name: 'Botnet / Proxies', count: botViews, percentage: botRate }
    ].filter(a => a.count > 0);

    return {
      linkId: link.id,
      linkName: link.name,
      slug: link.slug,
      fallbackUrl: link.fallbackUrl,
      timeRange,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      kpis,
      timeseries,
      cloakingReasons,
      countryDistribution,
      deviceBreakdown,
      osBreakdown,
      browserBreakdown,
      referrerBreakdown,
      asnBreakdown
    };
  }

  /**
   * Cross-Link Global Overview Analytics
   */
  static async getOverviewStats(companyId?: string, options: TrafficAnalyticsQueryOptions = {}) {
    const effectiveCompanyId = this.resolveCompanyId(companyId);
    const whereLink: any = {};
    if (effectiveCompanyId) {
      whereLink.companyId = effectiveCompanyId;
    }

    const totalLinks = await db.trafficLink.count({ where: whereLink });
    const activeLinks = await db.trafficLink.count({
      where: { ...whereLink, isActive: true }
    });

    const links = await db.trafficLink.findMany({
      where: whereLink,
      select: { id: true, name: true, slug: true, totalClicks: true, fallbackUrl: true }
    });

    const linkIds = links.map((l: any) => l.id);
    const linkMap = new Map<string, any>(links.map((l: any) => [l.id, l]));

    if (linkIds.length === 0) {
      return {
        totalLinks: 0,
        activeLinks: 0,
        totalRequests: 0,
        totalHumans: 0,
        totalBots: 0,
        totalDatacenter: 0,
        targetViews: 0,
        safeViews: 0,
        botRatio: 0,
        datacenterRatio: 0,
        targetRate: 0,
        avgLatencyMs: 0,
        anomalyDetected: false,
        anomalyMessage: null,
        topCountries: [],
        topDevices: [],
        timeseries: [],
        cloakingReasons: [],
        recentLogs: []
      };
    }

    const { timeRange = 'today', startDate, endDate } = options;
    const { start, end } = computeDateRange(timeRange, startDate, endDate);

    const logWhere: any = {
      linkId: { in: linkIds },
      timestamp: {
        gte: start,
        lte: end
      }
    };

    const logs = await db.trafficLog.findMany({
      where: logWhere,
      orderBy: { timestamp: 'asc' },
      take: 500,
      select: {
        id: true,
        linkId: true,
        timestamp: true,
        country: true,
        deviceType: true,
        os: true,
        browser: true,
        isBot: true,
        botName: true,
        networkType: true,
        destinationUrl: true,
        latencyMs: true,
        ipAddress: true
      }
    });

    const totalRequests = logs.length;
    let totalBots = 0;
    let totalDatacenter = 0;
    let targetViews = 0;
    let safeViews = 0;
    let totalLatency = 0;

    const countryCountMap = new Map<string, number>();
    const deviceCountMap = new Map<string, number>();

    for (const log of logs) {
      const link = linkMap.get(log.linkId);
      const fallbackUrl = link?.fallbackUrl || '';
      const isTarget = log.destinationUrl && log.destinationUrl !== fallbackUrl && !log.isBot;

      if (isTarget) targetViews++;
      else safeViews++;

      if (log.isBot) totalBots++;
      if (log.networkType === 'datacenter') totalDatacenter++;
      totalLatency += (log.latencyMs || 0);

      const c = (log.country || 'Unknown').toUpperCase();
      countryCountMap.set(c, (countryCountMap.get(c) || 0) + 1);

      const d = log.deviceType ? log.deviceType.charAt(0).toUpperCase() + log.deviceType.slice(1) : 'Desktop';
      deviceCountMap.set(d, (deviceCountMap.get(d) || 0) + 1);
    }

    const totalHumans = totalRequests - totalBots;
    const botRatio = totalRequests > 0 ? Math.round((totalBots / totalRequests) * 100) : 0;
    const datacenterRatio = totalRequests > 0 ? Math.round((totalDatacenter / totalRequests) * 100) : 0;
    const targetRate = totalRequests > 0 ? Math.round((targetViews / totalRequests) * 100) : 0;
    const avgLatencyMs = totalRequests > 0 ? Math.round(totalLatency / totalRequests) : 0;

    // Anomaly Sentinel
    const anomalyDetected = totalRequests >= 20 && (botRatio > 60 || datacenterRatio > 50);
    const anomalyMessage = anomalyDetected
      ? `Traffic Anomaly Alert: ${botRatio}% of recent traffic originates from automated bots / datacenter ASNs.`
      : null;

    // Time-series
    const isHourly = ['today', 'yesterday', '24h'].includes(timeRange) || (end.getTime() - start.getTime() <= 36 * 3600 * 1000);
    const timeseriesMap = new Map<string, TrafficTimeseriesPoint>();

    if (isHourly) {
      const cursor = new Date(start);
      while (cursor <= end) {
        const hourStr = cursor.toISOString().substring(0, 13);
        const label = cursor.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        timeseriesMap.set(hourStr, {
          time: hourStr,
          timestamp: cursor.getTime(),
          label,
          total: 0,
          target: 0,
          safe: 0,
          bot: 0,
          datacenter: 0
        });
        cursor.setHours(cursor.getHours() + 1);
      }

      for (const log of logs) {
        const hourStr = new Date(log.timestamp).toISOString().substring(0, 13);
        const bucket = timeseriesMap.get(hourStr);
        if (bucket) {
          bucket.total++;
          const link = linkMap.get(log.linkId);
          const isTarget = log.destinationUrl && log.destinationUrl !== link?.fallbackUrl && !log.isBot;
          if (isTarget) bucket.target++;
          else bucket.safe++;
          if (log.isBot) bucket.bot++;
          if (log.networkType === 'datacenter') bucket.datacenter++;
        }
      }
    } else {
      const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      while (cursor <= endDay) {
        const dayStr = cursor.toISOString().substring(0, 10);
        const label = cursor.toLocaleDateString([], { month: 'short', day: 'numeric' });
        timeseriesMap.set(dayStr, {
          time: dayStr,
          timestamp: cursor.getTime(),
          label,
          total: 0,
          target: 0,
          safe: 0,
          bot: 0,
          datacenter: 0
        });
        cursor.setDate(cursor.getDate() + 1);
      }

      for (const log of logs) {
        const dayStr = new Date(log.timestamp).toISOString().substring(0, 10);
        const bucket = timeseriesMap.get(dayStr);
        if (bucket) {
          bucket.total++;
          const link = linkMap.get(log.linkId);
          const isTarget = log.destinationUrl && log.destinationUrl !== link?.fallbackUrl && !log.isBot;
          if (isTarget) bucket.target++;
          else bucket.safe++;
          if (log.isBot) bucket.bot++;
          if (log.networkType === 'datacenter') bucket.datacenter++;
        }
      }
    }

    const topCountries = Array.from(countryCountMap.entries())
      .map(([country, count]) => ({
        country,
        name: getCountryName(country),
        flag: getCountryFlag(country),
        count,
        percentage: totalRequests > 0 ? Math.round((count / totalRequests) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topDevices = Array.from(deviceCountMap.entries())
      .map(([device, count]) => ({
        device,
        count,
        percentage: totalRequests > 0 ? Math.round((count / totalRequests) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    const recentLogs = await db.trafficLog.findMany({
      where: { linkId: { in: linkIds } },
      orderBy: { timestamp: 'desc' },
      take: 20,
      include: {
        link: {
          select: { name: true, slug: true, fallbackUrl: true }
        }
      }
    });

    return {
      totalLinks,
      activeLinks,
      totalRequests,
      totalHumans,
      totalBots,
      totalDatacenter,
      targetViews,
      safeViews,
      botRatio,
      datacenterRatio,
      targetRate,
      avgLatencyMs,
      anomalyDetected,
      anomalyMessage,
      topCountries,
      topDevices,
      timeseries: Array.from(timeseriesMap.values()),
      recentLogs
    };
  }

  /**
   * Filtered Live Logs Stream & Inspection Service
   */
  static async getLogs(
    companyId?: string, 
    options: { 
      linkId?: string; 
      isBot?: boolean; 
      timeRange?: AnalyticsTimeRange;
      startDate?: string | Date;
      endDate?: string | Date;
      action?: 'all' | 'target_offer' | 'safe_page' | 'bot' | 'datacenter';
      country?: string;
      deviceType?: string;
      search?: string;
      page?: number; 
      limit?: number;
      cursor?: string;
      direction?: 'forward' | 'backward';
      includeTotalCount?: boolean;
    } = {}
  ) {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    const effectiveCompanyId = this.resolveCompanyId(companyId);
    const where: any = {};

    if (effectiveCompanyId && !options.linkId) {
      where.link = { companyId: effectiveCompanyId };
    }

    if (options.linkId) {
      where.linkId = options.linkId;
    }

    if (options.isBot !== undefined) {
      where.isBot = options.isBot;
    }

    if (options.country) {
      where.country = { equals: options.country, mode: 'insensitive' };
    }

    if (options.deviceType) {
      where.deviceType = { equals: options.deviceType, mode: 'insensitive' };
    }

    if (options.timeRange !== 'all' && (options.timeRange || options.startDate || options.endDate)) {
      const { start, end } = computeDateRange(options.timeRange || 'today', options.startDate, options.endDate);
      where.timestamp = {
        gte: start,
        lte: end
      };
    }

    if (options.action === 'bot') {
      where.isBot = true;
    } else if (options.action === 'datacenter') {
      where.networkType = 'datacenter';
    }

    if (options.search) {
      where.OR = [
        { ipAddress: { contains: options.search, mode: 'insensitive' } },
        { country: { contains: options.search, mode: 'insensitive' } },
        { city: { contains: options.search, mode: 'insensitive' } },
        { destinationUrl: { contains: options.search, mode: 'insensitive' } },
        { botName: { contains: options.search, mode: 'insensitive' } },
        { browser: { contains: options.search, mode: 'insensitive' } },
        { userAgent: { contains: options.search, mode: 'insensitive' } }
      ];
    }

    const selectIncludes = {
      link: {
        select: { name: true, slug: true, fallbackUrl: true }
      }
    };

    if (options.cursor) {
      const result = await paginateWithCursor(db.trafficLog, {
        where,
        cursor: options.cursor,
        limit,
        direction: options.direction || 'forward',
        sortField: 'timestamp',
        sortOrder: 'desc',
        include: selectIncludes,
        includeTotalCount: Boolean(options.includeTotalCount)
      });

      return {
        logs: result.items,
        pageInfo: result.pageInfo,
        total: result.pageInfo.totalCount,
        pagination: {
          page,
          limit,
          total: result.pageInfo.totalCount || 0,
          totalPages: Math.ceil((result.pageInfo.totalCount || 0) / limit)
        }
      };
    }

    const [logs, total] = await Promise.all([
      db.trafficLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
        include: selectIncludes
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
