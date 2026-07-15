const { redis } = require('../../../system-configs/config/redis.js');
const axios = require('axios');
const FinancialAnalyticsService = require('../../finance-app/finance-overview/financialAnalytics.service');

/**
 * Get high-level financial stats (Revenue, Expenses, Profit)
 */
exports.getFinancialStats = async (req, res, next) => {
    const companyId = req.user.companyId;
    const { startDate, endDate } = req.query;
    
    // Create a cache key based on tenant and date range
    const cacheKey = `analytics:financial:${companyId}:${startDate || 'default'}:${endDate || 'default'}`;

    try {
        // 1. Try Cache
        if (redis) {
            const cachedData = await redis.get(cacheKey);
            if (cachedData) {
                return res.json(JSON.parse(cachedData));
            }
        }

        // 2. Fetch Fresh Data
        const end = endDate ? new Date(endDate) : new Date();
        const start = startDate ? new Date(startDate) : new Date(new Date().setDate(end.getDate() - 30));

        const report = await FinancialAnalyticsService.getPLReport(req.prisma, start, end);
        const forecast = await FinancialAnalyticsService.getCashFlowForecast(req.prisma);

        const responseData = {
            success: true,
            summary: {
                totalRevenue: report.revenue,
                totalExpenses: report.expenses.total,
                netProfit: report.netProfit,
                margin: report.margin
            },
            forecast,
            period: report.period,
            cachedAt: new Date()
        };

        // 3. Store in Cache (TTL: 10 minutes)
        if (redis) {
            await redis.set(cacheKey, JSON.stringify(responseData), 'EX', 600);
        }

        res.json(responseData);
    } catch (err) { next(err); }
};

/**
 * Get detailed P&L report
 */
exports.getPLReport = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate are required' });
        }
        const report = await FinancialAnalyticsService.getPLReport(req.user.companyId, startDate, endDate);
        res.json({ success: true, report });
    } catch (err) { next(err); }
};

/**
 * Get individual project financials
 */
exports.getProjectFinancials = async (req, res, next) => {
    try {
        const report = await FinancialAnalyticsService.getProjectProfitability(req.user.companyId, req.params.projectId);
        res.json({ success: true, report });
    } catch (err) { next(err); }
};

/**
 * Get all projects profitability ranking
 */
exports.getAllProjectsProfitability = async (req, res, next) => {
    try {
        const Project = req.prisma.project;
        const projects = await Project.findMany({ 
            where: { status: { not: 'cancelled' }, companyId: req.user.companyId },
            select: { id: true, name: true, budget: true }
        });

        const reports = await Promise.all(projects.map(async (p) => {
            return await FinancialAnalyticsService.getProjectProfitability(req.prisma, p.id);
        }));

        res.json({ success: true, reports: reports.sort((a, b) => b.netProfit - a.netProfit) });
    } catch (err) { next(err); }
};

const PLAUSIBLE_API_BASE = 'https://plausible.io/api/v1';

/**
 * Get Plausible Analytics stats for the tenant
 */
exports.getPlausibleStats = async (req, res) => {
    try {
        const config = await req.prisma.companyConfig.findFirst({
            where: { companyId: req.user.companyId }
        });
        if (!config || !config.plausibleApiKey || !config.plausibleSiteId) {
            return res.status(400).json({
                error: 'Plausible Analytics is not configured. Please add your API Key and Site ID in Company Settings.'
            });
        }

        const { period = '30d', metrics = 'visitors,pageviews,bounce_rate,visit_duration', date } = req.query;

        // Construct params for Plausible API
        const params = {
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

        res.json({
            aggregate: aggregateRes.data.results,
            timeseries: timeseriesRes.data.results,
            topPages: topPagesRes.data.results,
            topSources: topSourcesRes.data.results,
            siteId: config.plausibleSiteId
        });

    } catch (error) {
        console.error('Plausible API Error:', error.response?.data || error.message);
        const detailedError = error.response?.data?.error || error.message;
        res.status(500).json({
            error: 'Failed to fetch analytics from Plausible',
            details: detailedError
        });
    }
};

/**
 * Test Plausible Connection
 */
exports.testPlausibleConnection = async (req, res) => {
    try {
        let { plausibleApiKey, plausibleSiteId } = req.body;

        if (!plausibleApiKey || !plausibleSiteId) {
            return res.status(400).json({ error: 'API Key and Site ID are required' });
        }

        // Sanitize Site ID
        plausibleSiteId = plausibleSiteId.replace(/^https?:\/\//, '').replace(/\/$/, '');

        const headers = {
            'Authorization': `Bearer ${plausibleApiKey}`
        };

        // Just try to fetch aggregate stats for today to verify
        await axios.get(`${PLAUSIBLE_API_BASE}/stats/aggregate`, {
            params: { site_id: plausibleSiteId, period: 'day' },
            headers
        });

        res.json({ message: 'Plausible connection verified successfully!' });

    } catch (error) {
        console.error('Plausible Connection Test Error:', error.response?.data || error.message);
        res.status(400).json({
            error: 'Connection test failed',
            details: error.response?.data?.error || error.message
        });
    }
};
