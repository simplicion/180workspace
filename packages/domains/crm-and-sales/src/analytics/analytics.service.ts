// @ts-nocheck
import { CrmCalculationService } from '../sales/crm-calculation.service';
import { EmailService } from '@workspace/backend-infra';
const emailService = EmailService;

import { prisma } from '@workspace/db';
import moment from 'moment';
import * as salesMath from '../utils/salesMath';
const bcrypt = require('bcryptjs');

export class AnalyticsService {
static async calculateLeadScore(leadIdOrDoc, settings) {
        let lead;

        if (typeof leadIdOrDoc === 'string') {
            lead = await prisma.lead.findUnique({ where: { id: leadIdOrDoc } });
        } else {
            lead = leadIdOrDoc;
        }

        if (!lead) throw new Error('Lead not found');

        const config = settings?.salesConfig?.leadScoring || {
            companySizeWeight: 0.3, industryWeight: 0.25, engagementWeight: 0.25, sourceWeight: 0.2
        };

        let sizeScore = lead.companySize > 500 ? 100 : lead.companySize > 50 ? 50 : 10;
        let indScore = ['Technology', 'SaaS', 'Finance'].includes(lead.industry) ? 100 : 50;
        let srcScore = lead.source === 'Inbound' ? 100 : lead.source === 'Referral' ? 80 : 30;

        const calculatedScore = Math.round(
            (sizeScore * config.companySizeWeight) +
            (indScore * config.industryWeight) +
            ((lead.engagementScore || 0) * (config.engagementWeight || 0.25)) +
            (srcScore * config.sourceWeight)
        ) || 0;

        if (typeof leadIdOrDoc === 'string') {
            await prisma.lead.update({
                where: { id: leadIdOrDoc },
                data: { leadScore: calculatedScore }
            });
        } else {
            lead.leadScore = calculatedScore;
        }
        
        return calculatedScore;
    }

static async calculateWinProbability(opportunityId, settings) {
        const opp = await prisma.deal.findUnique({ where: { id: opportunityId } });
        if (!opp) throw new Error('Opportunity not found');

        const stages = settings?.salesConfig?.opportunityStages || {
            leadWeight: 0.1, qualifiedWeight: 0.3, demoWeight: 0.5, proposalWeight: 0.7, negotiationWeight: 0.85
        };

        const stageWeights = {
            'Lead': stages.leadWeight,
            'Qualified': stages.qualifiedWeight,
            'Demo': stages.demoWeight,
            'Proposal': stages.proposalWeight,
            'Negotiation': stages.negotiationWeight,
            'ClosedWon': 1.0,
            'ClosedLost': 0.0
        };

        const w1 = stageWeights[opp.stage] || 0.1;
        const engMultiplier = 0.5 + ((opp.engagementScore || 0) / 100);

        let calcProb = Math.min(100, Math.round(w1 * engMultiplier * 100));
        if (opp.stage === 'ClosedWon') calcProb = 100;
        if (opp.stage === 'ClosedLost') calcProb = 0;

        await prisma.deal.update({
            where: { id: opportunityId },
            data: { probability: calcProb }
        });
        return calcProb;
    }

static async calculateWeightedForecast(periodStr) {
        const opps = await prisma.deal.findMany({
            where: { stage: { notIn: ['ClosedWon', 'ClosedLost'] } }
        });

        let totalExpected = 0;
        let totalWeighted = 0;

        opps.forEach(opp => {
            const val = opp.value || 0;
            const prob = opp.probability || 0;
            totalExpected += val;
            totalWeighted += (val * (prob / 100));
        });

        await prisma.salesForecast.upsert({
            where: {
                period_type: {
                    period: periodStr,
                    type: 'monthly'
                }
            },
            update: {
                expectedRevenue: totalExpected,
                weightedRevenue: totalWeighted
            },
            create: {
                period: periodStr,
                type: 'monthly',
                expectedRevenue: totalExpected,
                weightedRevenue: totalWeighted
            }
        });

        return { expectedRevenue: totalExpected, weightedRevenue: totalWeighted };
    }

static async calculateDashboardCharts(userId, timeframe = 'all') {
        try {
            // Pipeline by stage
            const opps = await prisma.deal.findMany({
                where: { stage: { not: 'ClosedLost' } },
                select: { stage: true, value: true }
            });

            const stageMap = {};
            opps.forEach(o => {
                if (!stageMap[o.stage]) stageMap[o.stage] = { total: 0, count: 0 };
                stageMap[o.stage].total += (o.value || 0);
                stageMap[o.stage].count += 1;
            });

            const pipelineByStage = Object.entries(stageMap).map(([name, curr]) => ({
                name,
                value: curr.total,
                count: curr.count
            }));

            // Revenue by rep
            const wonOpps = await prisma.deal.findMany({
                where: { stage: 'ClosedWon' },
                include: { owner: true }
            });

            const repMap = {};
            wonOpps.forEach(o => {
                const repName = o.owner?.name || 'Unknown Rep';
                if (!repMap[repName]) repMap[repName] = 0;
                repMap[repName] += (o.value || 0);
            });

            const revenueByRep = Object.entries(repMap)
                .map(([name, revenue]) => ({ name, revenue }))
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 5);

            // Dynamic Revenue vs Pipeline Trend
            const intervals = [];
            let formatStr = 'YYYY-MM';
            let dateInterval = 'months';
            let count = 5;
            
            if (timeframe === '7days' || timeframe === 'weekly') {
                formatStr = 'YYYY-MM-DD';
                dateInterval = 'days';
                count = 6;
            } else if (timeframe === 'month') {
                formatStr = 'YYYY-MM-DD';
                dateInterval = 'days';
                count = 29;
            }

            for (let i = count; i >= 0; i--) {
                intervals.push(moment().subtract(i, dateInterval).format(formatStr));
            }

            const globalStartDate = moment(intervals[0], formatStr).startOf(dateInterval === 'days' ? 'day' : 'month').toDate();
            const globalEndDate = moment(intervals[intervals.length - 1], formatStr).endOf(dateInterval === 'days' ? 'day' : 'month').toDate();

            const allOppsInInterval = await prisma.deal.findMany({
                where: {
                    expectedCloseDate: { gte: globalStartDate, lte: globalEndDate }
                },
                select: { stage: true, value: true, expectedCloseDate: true }
            });

            const trendData = [];
            for (const m of intervals) {
                const startDate = moment(m, formatStr).startOf(dateInterval === 'days' ? 'day' : 'month').toDate();
                const endDate = moment(m, formatStr).endOf(dateInterval === 'days' ? 'day' : 'month').toDate();

                let wonTotal = 0;
                let pipeTotal = 0;

                for (const o of allOppsInInterval) {
                    if (o.expectedCloseDate >= startDate && o.expectedCloseDate <= endDate) {
                        if (o.stage === 'ClosedWon') wonTotal += (o.value || 0);
                        else if (o.stage !== 'ClosedLost') pipeTotal += (o.value || 0);
                    }
                }

                trendData.push({
                    name: moment(m, formatStr).format(dateInterval === 'days' ? 'MMM DD' : 'MMM'),
                    revenue: wonTotal,
                    pipeline: pipeTotal
                });
            }

            return {
                pipelineByStage: pipelineByStage || [],
                revenueByRep: revenueByRep || [],
                trendData: trendData || []
            };
        } catch (err) {
            console.error('[SalesService] calculateDashboardCharts failed:', err);
            return { pipelineByStage: [], revenueByRep: [], trendData: [] };
        }
    }

static async getDashboardMetrics(userId, timeframe = 'month') {
        const Settings = prisma.settings;
        const Account = prisma.client;
        const SalesActivity = prisma.salesActivity;
        const SalesTask = prisma.salesTask;

        const settings = await Settings.findFirst();
        const currentMonth = new Date().toISOString().substring(0, 7);

        let startDate = null;
        if (timeframe !== 'all') {
            const dateObj = moment();
            if (timeframe === '7days') dateObj.subtract(7, 'days');
            else if (timeframe === 'weekly') dateObj.startOf('isoWeek');
            else if (timeframe === 'month') dateObj.subtract(30, 'days');
            else if (timeframe === 'months') dateObj.subtract(6, 'months');
            startDate = dateObj.toDate();
        }

        const dateFilter = startDate ? { createdAt: { gte: startDate } } : {};
        const oppDateFilter = startDate ? { expectedCloseDate: { gte: startDate } } : {};
        const activityDateFilter = startDate ? { timestamp: { gte: startDate } } : {};

        const [
            weightedForecast,
            funnel,
            dashboardCharts,
            salesCycle,
            repProductivity,
            churnAccounts,
            stagnantOpps,
            totalLeads,
            activeOpps,
            totalAccounts,
            wonRevenueAggr,
            recentActivities,
            pendingLeads,
            activeLeads,
            totalDeals,
            completedDeals,
            totalLeadMoneyAggr,
            pipelineValueAggr
        ] = await Promise.all([
            this.calculateWeightedForecast(currentMonth).catch(() => null),
            this.calculateFunnelConversion().catch(() => null),
            this.calculateDashboardCharts(userId, timeframe).catch(() => null),
            this.calculateSalesCycleLength().catch(() => null),
            this.calculateRepProductivity(userId, settings).catch(() => null),
            this.detectChurnStagnation().catch(() => null),
            this.detectStagnantOpportunities(14).catch(() => null),
            prisma.lead.count({ where: { deletedAt: null, status: { not: 'converted' }, ...dateFilter } }).catch(() => 0),
            prisma.deal.count({ where: { stage: { notIn: ['ClosedWon', 'ClosedLost'] }, ...(startDate ? { createdAt: { gte: startDate } } : {}) } }).catch(() => 0),
            Account.count({ where: dateFilter }).catch(() => 0),
            prisma.deal.aggregate({ where: { stage: 'ClosedWon', ...(startDate ? { expectedCloseDate: { gte: startDate } } : {}) }, _sum: { value: true } }).then(res => [{ total: res._sum?.value || 0 }]).catch(() => []),
            SalesActivity.findMany({ 
                where: {
                    ...activityDateFilter,
                    OR: [
                        { dealId: null },
                        { deal: { deletedAt: null } }
                    ]
                },
                orderBy: { timestamp: 'desc' }, 
                take: 10,
                include: {
                    owner: { select: { id: true, name: true, email: true } },
                    lead: { select: { id: true, title: true, source: true } },
                    deal: { select: { id: true, name: true, companyName: true, source: true } },
                    relatedClient: { select: { id: true, name: true, company: true } }
                }
            }).catch(() => []),
            prisma.lead.count({ where: { deletedAt: null, status: { in: ['new', 'pending', 'Lead'] }, ...dateFilter } }).catch(() => 0),
            prisma.lead.count({ where: { deletedAt: null, status: { in: ['Contacted', 'Qualified', 'Demo', 'Proposal', 'Negotiation'] }, ...dateFilter } }).catch(() => 0),
            prisma.deal.count({ where: dateFilter }).catch(() => 0),
            prisma.deal.count({ where: { stage: 'ClosedWon', ...oppDateFilter } }).catch(() => 0),
            prisma.lead.aggregate({ where: { deletedAt: null, status: { notIn: ['ClosedLost', 'lost', 'rejected', 'archived', 'converted', 'ClosedWon'] }, ...dateFilter }, _sum: { value: true } }).then(res => [{ total: res._sum?.value || 0 }]).catch(() => []),
            prisma.deal.aggregate({ where: { stage: { notIn: ['ClosedWon', 'ClosedLost'] }, ...dateFilter }, _sum: { value: true } }).then(res => [{ total: res._sum?.value || 0 }]).catch(() => [])
        ]);

        const wonRevenue = wonRevenueAggr.length ? wonRevenueAggr[0].total : 0;
        const totalLeadMoney = totalLeadMoneyAggr && totalLeadMoneyAggr.length ? totalLeadMoneyAggr[0].total : 0;
        const pipelineMoney = pipelineValueAggr && pipelineValueAggr.length ? pipelineValueAggr[0].total : 0;

        let recommendations = [];
        try {
            recommendations = await SalesTask.findMany({
                where: { 
                    assignedTo: userId, 
                    status: 'pending',
                    OR: [
                        { dealId: null },
                        { deal: { deletedAt: null } }
                    ]
                },
                include: {
                    lead: { select: { title: true, value: true } },
                    deal: { select: { name: true, companyName: true } }
                },
                orderBy: { dueDate: 'asc' },
                take: 5
            });
        } catch (taskErr) {}

        const anomalies = (stagnantOpps || []).slice(0, 3).map(id => ({
            message: `Deal #${id.toString().slice(-4)} has been stagnant for over 14 days.`,
            type: 'stagnant',
            severity: 'medium'
        }));

        return {
            metrics: {
                totalLeads: totalLeads || 0,
                pendingLeads: pendingLeads || 0,
                activeLeads: activeLeads || 0,
                totalDeals: totalDeals || 0,
                activeOpportunities: activeOpps || 0,
                completedDeals: completedDeals || 0,
                totalAccounts: totalAccounts || 0,
                openPipelineValue: pipelineMoney || 0,
                weightedPipelineValue: weightedForecast?.weightedRevenue || 0,
                wonRevenue: wonRevenue || 0,
                totalPipelineValue: pipelineMoney || 0,
                totalLeadMoney: totalLeadMoney || 0
            },
            forecast: { currentMonth: weightedForecast },
            charts: dashboardCharts || { trendData: [], pipelineByStage: [], revenueByRep: [] },
            funnel: funnel || { leadConversionRate: 0, proposalConversionRate: 0, dealWinRate: 0 },
            recentActivities: recentActivities || [],
            anomalies: anomalies,
            recommendations: recommendations || [],
            repStats: {
                productivity: repProductivity,
                salesCycle: salesCycle,
                churnAccounts: (churnAccounts || []).length
            }
        };
    }

static async getRevenueStats(timeframe = 'all') {
        const moment = require('moment');

        let dateFilter = undefined;
        let groupByFormat = 'YYYY-MM';
        let displayFormat = 'MMM YYYY';
        
        if (timeframe === '7days') {
            dateFilter = { gte: moment().subtract(7, 'days').startOf('day').toDate() };
            groupByFormat = 'YYYY-MM-DD';
            displayFormat = 'MMM DD';
        } else if (timeframe === 'weekly') {
            dateFilter = { gte: moment().startOf('week').toDate() };
            groupByFormat = 'YYYY-MM-DD';
            displayFormat = 'MMM DD';
        } else if (timeframe === 'months') {
            dateFilter = { gte: moment().subtract(6, 'months').startOf('month').toDate() };
        } else if (timeframe === 'month') {
            dateFilter = { gte: moment().subtract(1, 'month').startOf('day').toDate() };
            groupByFormat = 'YYYY-MM-DD';
            displayFormat = 'MMM DD';
        }

        const closedWonWhere = { stage: 'ClosedWon' };
        if (dateFilter) closedWonWhere.expectedCloseDate = dateFilter;

        const closedWonAgg = await prisma.deal.aggregate({ where: closedWonWhere, _sum: { value: true } });
        const closedWonValue = closedWonAgg._sum.value || 0;

        const rawOpps = await prisma.deal.findMany({
            where: closedWonWhere,
            select: { expectedCloseDate: true, value: true }
        });
        
        const trendMap = {};
        rawOpps.forEach(opp => {
            if(!opp.expectedCloseDate) return;
            const m = moment(opp.expectedCloseDate).format(groupByFormat);
            if(!trendMap[m]) trendMap[m] = { _id: m, revenue: 0, deals: 0 };
            trendMap[m].revenue += (opp.value || 0);
            trendMap[m].deals += 1;
        });
        const monthlyTrendData = Object.values(trendMap).sort((a,b) => a._id.localeCompare(b._id));

        const openOppsWhere = { stage: { notIn: ['ClosedWon', 'ClosedLost'] } };
        if (dateFilter) openOppsWhere.expectedCloseDate = dateFilter;

        const pipelineAgg = await prisma.deal.aggregate({ where: openOppsWhere, _sum: { value: true } });
        const pipelineValue = pipelineAgg._sum.value || 0;

        // Group Pipeline by Stage AND Time for graph-based view
        const rawOpenOpps = await prisma.deal.findMany({
            where: openOppsWhere,
            select: { stage: true, value: true, expectedCloseDate: true }
        });

        const pipelineTrendMap = {};
        rawOpenOpps.forEach(opp => {
            if(!opp.expectedCloseDate) return;
            const m = moment(opp.expectedCloseDate).format(groupByFormat);
            if(!pipelineTrendMap[m]) pipelineTrendMap[m] = { date: m };
            if(!pipelineTrendMap[m][opp.stage]) pipelineTrendMap[m][opp.stage] = 0;
            pipelineTrendMap[m][opp.stage] += (opp.value || 0);
        });

        const pipelineTrendData = Object.values(pipelineTrendMap)
            .sort((a,b) => a.date.localeCompare(b.date))
            .map(item => {
                const formatted = { date: moment(item.date, groupByFormat).format(displayFormat) };
                Object.keys(item).forEach(k => {
                    if (k !== 'date') formatted[k] = item[k];
                });
                return formatted;
            });

        // Also get the old static pipeline by stage for the pie/bar chart if they still need it
        const pbsRaw = await prisma.deal.groupBy({
            by: ['stage'],
            where: openOppsWhere,
            _count: { _all: true },
            _sum: { value: true }
        });
        const pipelineByStage = pbsRaw.map(p => ({ _id: p.stage, count: p._count._all, totalValue: p._sum.value || 0 })).sort((a,b) => b.totalValue - a.totalValue);

        const winLossWhere = { stage: { in: ['ClosedWon', 'ClosedLost'] } };
        if (dateFilter) winLossWhere.expectedCloseDate = dateFilter;

        const winLoss = await prisma.deal.groupBy({
            by: ['stage'],
            where: winLossWhere,
            _count: { _all: true }
        });

        let wonCount = 0; let lostCount = 0;
        winLoss.forEach(st => {
            if (st.stage === 'ClosedWon') wonCount = st._count._all;
            if (st.stage === 'ClosedLost') lostCount = st._count._all;
        });

        const topDeals = await prisma.deal.findMany({ 
            where: { stage: 'ClosedWon' }, 
            orderBy: { value: 'desc' }, 
            take: 5, 
            select: { title: true, value: true, expectedCloseDate: true } 
        });

        // Calculate Daily Activity Trend for the current month
        const startOfMonth = moment().startOf('month').toDate();
        const endOfMonth = moment().endOf('month').toDate();
        const daysInMonth = moment().daysInMonth();
        const dailyActivityTrend = [];

        const leadsThisMonth = await prisma.lead.findMany({
            where: { deletedAt: null, createdAt: { gte: startOfMonth, lte: endOfMonth } },
            select: { createdAt: true }
        });

        const oppsThisMonth = await prisma.deal.findMany({
            where: { createdAt: { gte: startOfMonth, lte: endOfMonth } },
            select: { createdAt: true }
        });

        const allLeads = [...leadsThisMonth, ...oppsThisMonth];

        const activitiesThisMonth = await prisma.salesActivity.findMany({
            where: { timestamp: { gte: startOfMonth, lte: endOfMonth } },
            select: { timestamp: true }
        });

        for (let i = 1; i <= daysInMonth; i++) {
            const dayDate = moment().date(i).format('YYYY-MM-DD');
            const leadsCount = allLeads.filter(l => moment(l.createdAt).format('YYYY-MM-DD') === dayDate).length;
            const activitiesCount = activitiesThisMonth.filter(a => moment(a.timestamp).format('YYYY-MM-DD') === dayDate).length;

            dailyActivityTrend.push({
                date: moment().date(i).format('MMM DD'),
                fullDate: dayDate,
                Leads: leadsCount,
                Activities: activitiesCount
            });
        }

        return {
            overview: {
                totalRevenue: closedWonValue,
                mrr: closedWonValue * 0.05,
                arr: closedWonValue * 0.05 * 12,
                pipelineValue,
                wonDeals: wonCount,
                lostDeals: lostCount
            },
            monthlyTrend: monthlyTrendData.map(t => ({
                month: moment(t._id, 'YYYY-MM').format('MMM YYYY'),
                revenue: t.revenue,
                deals: t.deals
            })),
            pipelineByStage: pipelineByStage.map(s => ({ stage: s._id, count: s.count, value: s.totalValue })),
            pipelineTrend: pipelineTrendData,
            topDeals,
            dailyActivityTrend
        };
    }

static async calculateFunnelConversion() {
        const totalLeads = await prisma.lead.count() || 1;
        const qualifiedLeads = await prisma.lead.count({
            where: { status: { in: ['qualified', 'converted'] } }
        });

        const totalProposals = await prisma.deal.count({
            where: { stage: { in: ['Proposal', 'Negotiation', 'ClosedWon', 'ClosedLost'] } }
        }) || 1;
        const wonDeals = await prisma.deal.count({
            where: { stage: 'ClosedWon' }
        });

        return {
            leadConversionRate: (qualifiedLeads / totalLeads) * 100,
            proposalConversionRate: (wonDeals / totalProposals) * 100,
            dealWinRate: (wonDeals / totalProposals) * 100
        };
    }

static async calculateCLV(accountId) {
        const wonDeals = await prisma.deal.findMany({
            where: { accountId, stage: 'ClosedWon' }
        });

        if (!wonDeals.length) return 0;
        const avgDealValue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0) / wonDeals.length;
        const dealsPerYear = wonDeals.length;
        const retentionYears = 3;

        const clv = Math.round(avgDealValue * dealsPerYear * retentionYears);
        await prisma.account.update({
            where: { id: accountId },
            data: { clv }
        });
        return clv;
    }

static async segmentAccountsRFM() {
        const accounts = await prisma.account.findMany();

        const segments = [];
        for (let acc of accounts) {
            const deals = await prisma.deal.findMany({
                where: { accountId: acc.id, stage: 'ClosedWon' },
                orderBy: { expectedCloseDate: 'desc' }
            });
            if (!deals.length) continue;

            const recency = moment().diff(moment(deals[0].expectedCloseDate || deals[0].createdAt), 'days');
            const frequency = deals.length;
            const monetary = deals.reduce((sum, d) => sum + (d.value || 0), 0);

            let segment = 'At Risk';
            if (recency <= 90 && frequency >= 3) segment = 'Loyal';
            else if (recency <= 180 && frequency >= 1) segment = 'Active';

            segments.push({ accountId: acc.id, segment, r: recency, f: frequency, m: monetary });
        }
        return segments;
    }

static async calculateSalesCycleLength() {
        const wonDeals = await prisma.deal.findMany({
            where: { stage: 'ClosedWon' }
        });
        if (!wonDeals.length) return 0;

        let totalDays = 0;
        wonDeals.forEach(d => {
            const start = moment(d.createdAt);
            const close = moment(d.expectedCloseDate || d.updatedAt);
            totalDays += Math.max(1, close.diff(start, 'days'));
        });
        return Math.round(totalDays / wonDeals.length);
    }

static async detectChurnStagnation() {
        const accountsAtRisk = [];
        const contacts = await prisma.client.findMany();

        for (let c of contacts) {
            if (c.lastContacted) {
                const daysSince = moment().diff(moment(c.lastContacted), 'days');
                if (daysSince > 60) accountsAtRisk.push(c.accountId);
            }
        }
        return [...new Set(accountsAtRisk)];
    }

static async detectStagnantOpportunities(thresholdDays = 14) {
        const opps = await prisma.deal.findMany({
            where: { stage: { notIn: ['ClosedWon', 'ClosedLost'] } }
        });
        const stagnant = [];
        opps.forEach(opp => {
            const daysSinceUpdate = moment().diff(moment(opp.updatedAt), 'days');
            if (daysSinceUpdate >= thresholdDays) stagnant.push(opp.id);
        });
        return stagnant;
    }

static async calculateRepProductivity(userId, settings) {
        const config = settings?.salesConfig?.repProductivity || {
            dealsClosedWeight: 0.5, revenueGeneratedWeight: 0.3, activitiesCompletedWeight: 0.2
        };

        const dealsClosed = await prisma.deal.count({
            where: { ownerId: userId, stage: 'ClosedWon' }
        });

        const revenue = await prisma.deal.findMany({
            where: { ownerId: userId, stage: 'ClosedWon' },
            select: { value: true }
        });
        const revValue = revenue.reduce((sum, o) => sum + (o.value || 0), 0);

        const activities = await prisma.salesActivity.count({
            where: { ownerId: userId }
        });

        const score = Math.round(
            (Math.min(dealsClosed * 5, 50) * config.dealsClosedWeight) +
            (Math.min(revValue / 1000, 50) * config.revenueGeneratedWeight) +
            (Math.min(activities * 2, 50) * config.activitiesCompletedWeight)
        );
        return score;
    }

static async clusterAccountsByValue() {
        const accounts = await prisma.account.findMany({
            where: { clv: { gt: 0 } }
        });
        if (accounts.length < 3) return [];

        const clvs = accounts.map(a => a.clv);
        const clusters = salesMath.simple1DKMeans(clvs, 3);

        return accounts.map((a, idx) => ({ accountId: a.id, clusterId: clusters[idx] }));
    }

static async calculateWinLikelihoodLogistic(opportunityId) {
        const opp = await prisma.deal.findUnique({ where: { id: opportunityId } });
        if (!opp) return 0;

        const z = -2.0 + ((opp.engagementScore || 0) * 0.05) + ((opp.priorityScore || 0) * 0.1);
        return salesMath.sigmoid(z);
    }

static async calculateCustomerRiskIndex(accountId) {
        let riskScore = 0;
        const lostDeals = await prisma.deal.count({
            where: { accountId, stage: 'ClosedLost' }
        });
        riskScore += lostDeals * 20;

        const staleContacts = await prisma.client.count({
            where: {
                accountId,
                lastContacted: { lt: moment().subtract(60, 'days').toDate() }
            }
        });
        riskScore += staleContacts * 10;

        return Math.min(100, riskScore);
    }

static async calculateRevenueTrend() {
        const forecasts = await prisma.salesForecast.findMany({
            where: { type: 'monthly' },
            orderBy: { period: 'asc' }
        });
        if (!forecasts.length) return [];
        const revData = forecasts.map(f => f.expectedRevenue || 0);
        return salesMath.calculateEMA(revData, 3);
    }

static async performMarketBasketAnalysis() {
        // Concept/placeholder: assume Opportunity has a tags array representing products (stored in JSON or relation)
        const wonDeals = await prisma.deal.findMany({
            where: { stage: 'ClosedWon' }
        });
        const baskets = wonDeals
            .filter(d => d.tags && Array.isArray(d.tags) && d.tags.length > 0)
            .map(d => d.tags);
        return salesMath.getFrequentPairs(baskets, 0.1);
    }

static async findLookalikeAccounts(sourceAccountId) {
        const targetAcc = await prisma.account.findUnique({ where: { id: sourceAccountId } });
        const allAccs = await prisma.account.findMany({
            where: { id: { not: sourceAccountId } }
        });

        if (!targetAcc) return [];

        const targetVec = [targetAcc.employeeCount || 1, targetAcc.annualRevenue || 1, targetAcc.clv || 1];
        const results = [];

        for (let acc of allAccs) {
            const vec = [acc.employeeCount || 1, acc.annualRevenue || 1, acc.clv || 1];
            const sim = salesMath.cosineSimilarity(targetVec, vec);
            if (sim > 0.8) results.push({ accountId: acc.id, similarity: sim });
        }
        return results.sort((a, b) => b.similarity - a.similarity);
    }

static async detectActivityAnomalies(userId) {
        const lastWeek = await prisma.salesActivity.count({
            where: {
                ownerId: userId,
                timestamp: { gte: moment().subtract(7, 'days').toDate() }
            }
        });
        const typicalWeeklyRate = 20;
        if (lastWeek < typicalWeeklyRate * 0.5) return 'Activity unusually low';
        return 'Normal';
    }

static async optimizeTerritories() {
        const accounts = await prisma.account.findMany({
            select: { country: true, annualRevenue: true }
        });

        const territoryMap = {};
        accounts.forEach(a => {
            const country = a.country || 'Unknown';
            if (!territoryMap[country]) territoryMap[country] = { count: 0, totalRev: 0 };
            territoryMap[country].count += 1;
            territoryMap[country].totalRev += (a.annualRevenue || 0);
        });

        return Object.entries(territoryMap).map(([country, stats]) => ({
            _id: country,
            count: stats.count,
            totalRev: stats.totalRev
        }));
    }

static async getProductivity(userId) {
        const User = prisma.user;
        const allReps = await User.findMany({ where: { role: { in: ['admin', 'sales', 'manager'] } } });
        

        const leaderboard = [];
        for (const rep of allReps) {
            const [dealsClosed, revenue, activities] = await Promise.all([
                prisma.deal.count({ where: { ownerId: rep.id, stage: 'ClosedWon' } }),
                prisma.deal.aggregate({ where: { ownerId: rep.id, stage: 'ClosedWon' }, _sum: { value: true } }).then(res => [{ total: res._sum.value || 0 }]),
                prisma.salesActivity.count({ where: { ownerId: rep.id } })
            ]);

            const revValue = revenue.length ? revenue[0].total : 0;
            const score = CrmCalculationService.calculateRepProductivity(dealsClosed, revValue, activities);

            leaderboard.push({ id: rep.id, name: rep.name, email: rep.email, score, dealsClosed });
        }
        leaderboard.sort((a, b) => b.score - a.score);

        const suggestedRepId = await this.suggestRepForLead();
        let suggestedRep = null;
        if (suggestedRepId) {
            const r = await User.findUnique({ where: { id: suggestedRepId } });
            if (r) suggestedRep = { id: r.id, name: r.name };
        }

        return {
            myScore: leaderboard.find(l => l.id.toString() === userId.toString())?.score || 0,
            leaderboard,
            suggestedRepForNextLead: suggestedRep
        };
    }

static async getRecommendations(userId) {
        const tasks = await prisma.salesTask.findMany({
            where: {
                assignedTo: userId,
                status: 'pending',
                description: { contains: 'automat' } // Simplified
            },
            include: {
                relatedLead: { select: { name: true, company: true } },
                relatedDeal: { select: { title: true, value: true } }
            },
            orderBy: { dueDate: 'asc' },
            take: 5
        });
        return { recommendations: tasks };
    }

static async getSystemSettings() {
        return (await prisma.settings.findFirst({ where: {} })) || {};
    }

}
