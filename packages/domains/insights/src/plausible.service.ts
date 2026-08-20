import axios from 'axios';
import { prisma } from '@workspace/db';

const PLAUSIBLE_API_BASE = 'https://plausible.io/api/v1';

export class PlausibleService {
  static async getStats(companyId: string, period: string = '30d', metrics: string = 'visitors,pageviews,bounce_rate,visit_duration', date?: string) {
    const config = await prisma.companyConfig.findFirst({
        where: { companyId }
    }) as any;
    if (!config || !config.plausibleApiKey || !config.plausibleSiteId) {
        throw new Error('Plausible Analytics is not configured. Please add your API Key and Site ID in Company Settings.');
    }

    // Construct params for Plausible API
    const params: any = {
        site_id: config.plausibleSiteId,
        period,
        metrics
    };

    if (date) params.date = date;

    const headers = {
        'Authorization': `Bearer ${config.plausibleApiKey}`
    };

    // 1. Fetch Aggregate Data
    const aggregateRes = await axios.get(`${PLAUSIBLE_API_BASE}/stats/aggregate`, { params, headers });

    // 2. Fetch Timeseries Data for the chart
    const timeseriesRes = await axios.get(`${PLAUSIBLE_API_BASE}/stats/timeseries`, {
        params: { ...params, interval: period === 'realtime' ? 'minute' : 'date' },
        headers
    });

    // 3. Fetch Top Pages
    const topPagesRes = await axios.get(`${PLAUSIBLE_API_BASE}/stats/breakdown`, {
        params: { ...params, property: 'event:page', limit: 5 },
        headers
    });

    // 4. Fetch Top Sources
    const topSourcesRes = await axios.get(`${PLAUSIBLE_API_BASE}/stats/breakdown`, {
        params: { ...params, property: 'visit:source', limit: 5 },
        headers
    });

    return {
        aggregate: aggregateRes.data.results,
        timeseries: timeseriesRes.data.results,
        topPages: topPagesRes.data.results,
        topSources: topSourcesRes.data.results,
        siteId: config.plausibleSiteId
    };
  }

  static async testConnection(plausibleApiKey: string, plausibleSiteId: string) {
    if (!plausibleApiKey || !plausibleSiteId) {
        throw new Error('API Key and Site ID are required');
    }

    // Sanitize Site ID
    const sanitizedSiteId = plausibleSiteId.replace(/^https?:\/\//, '').replace(/\/$/, '');

    const headers = {
        'Authorization': `Bearer ${plausibleApiKey}`
    };

    // Just try to fetch aggregate stats for today to verify
    await axios.get(`${PLAUSIBLE_API_BASE}/stats/aggregate`, {
        params: { site_id: sanitizedSiteId, period: 'day' },
        headers
    });

    return true;
  }
}
