const { redis } = require('../../../system-configs/config/redis.js');
const { FinanceOverviewService } = require('@workspace/finance');
const { PlausibleService } = require('@workspace/insights');

/**
 * Get high-level financial stats (Revenue, Expenses, Profit)
 */
exports.getFinancialStats = async (req, res, next) => {
    const companyId = req.user.companyId;
    const { startDate, endDate } = req.query;
    
    // Create a cache key based on company and date range
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

        const report = await FinanceOverviewService.getPLReport(companyId, start.toISOString(), end.toISOString());
        const forecast = await FinanceOverviewService.getCashFlowForecast(companyId);

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
        const report = await FinanceOverviewService.getPLReport(req.user.companyId, startDate, endDate);
        res.json({ success: true, report });
    } catch (err) { next(err); }
};

/**
 * Get individual project financials
 */
exports.getProjectFinancials = async (req, res, next) => {
    try {
        const report = await FinanceOverviewService.getProjectProfitability(req.user.companyId, req.params.projectId);
        res.json({ success: true, report });
    } catch (err) { next(err); }
};

/**
 * Get all projects profitability ranking
 */
exports.getAllProjectsProfitability = async (req, res, next) => {
    try {
        const reports = await FinanceOverviewService.getAllProjectsProfitability(req.user.companyId);
        res.json({ success: true, reports });
    } catch (err) { next(err); }
};

/**
 * Get Plausible Analytics stats for the company
 */
exports.getPlausibleStats = async (req, res) => {
    try {
        const { period, metrics, date } = req.query;
        const stats = await PlausibleService.getStats(req.user.companyId, period, metrics, date);
        res.json(stats);
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
        await PlausibleService.testConnection(plausibleApiKey, plausibleSiteId);
        res.json({ message: 'Plausible connection verified successfully!' });
    } catch (error) {
        console.error('Plausible Connection Test Error:', error.response?.data || error.message);
        res.status(400).json({
            error: 'Connection test failed',
            details: error.response?.data?.error || error.message
        });
    }
};
