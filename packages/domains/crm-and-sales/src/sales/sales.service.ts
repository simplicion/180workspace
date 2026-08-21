// @ts-nocheck
import { prisma } from '@workspace/db';
﻿import moment from 'moment';
import * as salesMath from '../utils/salesMath';
const bcrypt = require('bcryptjs');


export class SalesService {
    // ------------------------------------------------------------------------
    // [1-3] Scoring & Forecasting
    // ------------------------------------------------------------------------

    // [1] Lead Scoring: (CompanySize Ãƒâ€” W1) + (IndustryMatch Ãƒâ€” W2) + ...
    static async calculateLeadScore(leadIdOrDoc, settings) {
        let lead;

        if (typeof leadIdOrDoc === 'string') {
            lead = await prisma.deal.findUnique({ where: { id: leadIdOrDoc } });
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
            await prisma.deal.update({
                where: { id: leadIdOrDoc },
                data: { leadScore: calculatedScore }
            });
        } else {
            lead.leadScore = calculatedScore;
        }
        
        return calculatedScore;
    }

    // [2] Win Probability: StageWeight Ãƒâ€” EngagementScore
    static async calculateWinProbability(opportunityId, settings) {
        const opp = await prisma.lead.findUnique({ where: { id: opportunityId } });
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

        await prisma.lead.update({
            where: { id: opportunityId },
            data: { probability: calcProb }
        });
        return calcProb;
    }

    // [3] Weighted Forecast: ÃŽÂ£ (DealValue Ãƒâ€” WinProbability)
    static async calculateWeightedForecast(periodStr) {
        const opps = await prisma.lead.findMany({
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

    // ------------------------------------------------------------------------
    // [4-7] Customer Value & Funnel
    // ------------------------------------------------------------------------

    // [4] Customer Lifetime Value (CLV)
    static async calculateCLV(accountId) {
        const wonDeals = await prisma.lead.findMany({
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

    // [5] RFM Analysis (Recency, Frequency, Monetary)
    static async segmentAccountsRFM() {
        const accounts = await prisma.account.findMany();

        const segments = [];
        for (let acc of accounts) {
            const deals = await prisma.lead.findMany({
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

    // [6] Funnel Conversion Rate
    static async calculateFunnelConversion() {
        const totalLeads = await prisma.deal.count() || 1;
        const qualifiedLeads = await prisma.deal.count({
            where: { status: { in: ['qualified', 'converted'] } }
        });

        const totalProposals = await prisma.lead.count({
            where: { stage: { in: ['Proposal', 'Negotiation', 'ClosedWon', 'ClosedLost'] } }
        }) || 1;
        const wonDeals = await prisma.lead.count({
            where: { stage: 'ClosedWon' }
        });

        return {
            leadConversionRate: (qualifiedLeads / totalLeads) * 100,
            proposalConversionRate: (wonDeals / totalProposals) * 100,
            dealWinRate: (wonDeals / totalProposals) * 100
        };
    }

    // [6b] Dashboard Realtime Charts
    static async calculateDashboardCharts(userId, timeframe = 'all') {
        try {
            // Pipeline by stage
            const opps = await prisma.lead.findMany({
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
            const wonOpps = await prisma.lead.findMany({
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

            const trendData = [];
            for (const m of intervals) {
                const startDate = moment(m, formatStr).startOf(dateInterval === 'days' ? 'day' : 'month').toDate();
                const endDate = moment(m, formatStr).endOf(dateInterval === 'days' ? 'day' : 'month').toDate();

                const wonMonth = await prisma.lead.findMany({
                    where: {
                        stage: 'ClosedWon',
                        expectedCloseDate: { gte: startDate, lte: endDate }
                    },
                    select: { value: true }
                });
                const wonTotal = wonMonth.reduce((sum, o) => sum + (o.value || 0), 0);

                const pipeMonth = await prisma.lead.findMany({
                    where: {
                        stage: { notIn: ['ClosedWon', 'ClosedLost'] },
                        expectedCloseDate: { gte: startDate, lte: endDate }
                    },
                    select: { value: true }
                });
                const pipeTotal = pipeMonth.reduce((sum, o) => sum + (o.value || 0), 0);

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

    // [7] Sales Cycle Length
    static async calculateSalesCycleLength() {
        const wonDeals = await prisma.lead.findMany({
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

    // ------------------------------------------------------------------------
    // [8-11] Deduplication, Priority & Churn
    // ------------------------------------------------------------------------

    // [8] Lead Deduplication (Levenshtein)
    static async findDuplicateLeads(leadName, email) {
        const leads = await prisma.deal.findMany({
            where: { status: { not: 'converted' } }
        });
        let duplicates = [];
        for (let l of leads) {
            let similarity = salesMath.stringSimilarity(leadName, l.name);
            if (email && l.email === email) similarity = 1.0;
            if (similarity > 0.85) duplicates.push({ leadId: l.id, similarity });
        }
        return duplicates;
    }

    // [9] Priority Ranking
    static async rankOpportunities() {
        const opps = await prisma.lead.findMany({
            where: { stage: { notIn: ['ClosedWon', 'ClosedLost'] } }
        });

        for (const opp of opps) {
            const priorityScore = ((opp.value || 0) * (opp.probability || 0) * (opp.engagementScore || 1)) / 10000;
            await prisma.lead.update({
                where: { id: opp.id },
                data: { priorityScore }
            });
        }

        const updatedOpps = await prisma.lead.findMany({
            where: { stage: { notIn: ['ClosedWon', 'ClosedLost'] } },
            orderBy: { priorityScore: 'desc' }
        });
        return updatedOpps;
    }

    // [10] Churn Risk / Stagnation detection for Accounts
    static async detectChurnStagnation() {
        const accountsAtRisk = [];
        const contacts = await prisma.contact.findMany();

        for (let c of contacts) {
            if (c.lastContacted) {
                const daysSince = moment().diff(moment(c.lastContacted), 'days');
                if (daysSince > 60) accountsAtRisk.push(c.accountId);
            }
        }
        return [...new Set(accountsAtRisk)];
    }

    // [11] Stagnation Detection for Deals
    static async detectStagnantOpportunities(thresholdDays = 14) {
        const opps = await prisma.lead.findMany({
            where: { stage: { notIn: ['ClosedWon', 'ClosedLost'] } }
        });
        const stagnant = [];
        opps.forEach(opp => {
            const daysSinceUpdate = moment().diff(moment(opp.updatedAt), 'days');
            if (daysSinceUpdate >= thresholdDays) stagnant.push(opp.id);
        });
        return stagnant;
    }

    // ------------------------------------------------------------------------
    // [12-15] Productivity, Balancing, Regression, Clustering
    // ------------------------------------------------------------------------

    // [12] Rep Productivity
    static async calculateRepProductivity(userId, settings) {
        const config = settings?.salesConfig?.repProductivity || {
            dealsClosedWeight: 0.5, revenueGeneratedWeight: 0.3, activitiesCompletedWeight: 0.2
        };

        const dealsClosed = await prisma.lead.count({
            where: { ownerId: userId, stage: 'ClosedWon' }
        });

        const revenue = await prisma.lead.findMany({
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

    // [13] Workload Balancing
    static async suggestRepForLead() {
        const leads = await prisma.deal.findMany({
            where: { status: { in: ['new', 'contacted'] } }
        });

        const repMap = {};
        leads.forEach(l => {
            if (l.assignedSalesRepId) {
                repMap[l.assignedSalesRepId] = (repMap[l.assignedSalesRepId] || 0) + 1;
            }
        });

        let minRep = null;
        let minCount = Infinity;
        for (const [repId, count] of Object.entries(repMap)) {
            if (count < minCount) {
                minCount = count;
                minRep = repId;
            }
        }
        return minRep;
    }

    // [14] K-Means Clustering for Segmentation
    static async clusterAccountsByValue() {
        const accounts = await prisma.account.findMany({
            where: { clv: { gt: 0 } }
        });
        if (accounts.length < 3) return [];

        const clvs = accounts.map(a => a.clv);
        const clusters = salesMath.simple1DKMeans(clvs, 3);

        return accounts.map((a, idx) => ({ accountId: a.id, clusterId: clusters[idx] }));
    }

    // [15] Logistic Regression Approximation for Win Likelihood
    static async calculateWinLikelihoodLogistic(opportunityId) {
        const opp = await prisma.lead.findUnique({ where: { id: opportunityId } });
        if (!opp) return 0;

        const z = -2.0 + ((opp.engagementScore || 0) * 0.05) + ((opp.priorityScore || 0) * 0.1);
        return salesMath.sigmoid(z);
    }

    // ------------------------------------------------------------------------
    // [16-19] Engagement, Next Action, Meeting, Risk Index
    // ------------------------------------------------------------------------

    // [16] Email Engagement Scoring
    static calculateEmailEngagement(opens = 0, clicks = 0, replies = 0) {
        return (opens * 1) + (clicks * 2) + (replies * 5);
    }

    // [17] Next Best Action Engine
    static async determineNextBestAction(opportunityId) {
        const opp = await prisma.lead.findUnique({ where: { id: opportunityId } });
        if (!opp) return 'No action';

        const daysSinceUpdate = moment().diff(moment(opp.updatedAt), 'days');
        if (daysSinceUpdate > 7) return 'Follow up email';
        if (opp.stage === 'Proposal') return 'Schedule negotiation call';
        if (opp.stage === 'Qualified') return 'Send product demo link';
        return 'Monitor engagement';
    }

    // [18] Meeting Effectiveness Score
    static calculateMeetingEffectiveness(durationMins, decisionsMade, actionItemsCount) {
        const efficiency = durationMins > 0 ? (actionItemsCount * 10) / durationMins : 0;
        return Math.min(100, Math.round(efficiency * 100 + decisionsMade * 20));
    }

    // [19] Customer Risk Index
    static async calculateCustomerRiskIndex(accountId) {
        let riskScore = 0;
        const lostDeals = await prisma.lead.count({
            where: { accountId, stage: 'ClosedLost' }
        });
        riskScore += lostDeals * 20;

        const staleContacts = await prisma.contact.count({
            where: {
                accountId,
                lastContacted: { lt: moment().subtract(60, 'days').toDate() }
            }
        });
        riskScore += staleContacts * 10;

        return Math.min(100, riskScore);
    }

    // ------------------------------------------------------------------------
    // [20-22] Time-Series, Market Basket, Cosine Similarity
    // ------------------------------------------------------------------------

    // [20] Revenue Trend / ARIMA / EMA
    static async calculateRevenueTrend() {
        const forecasts = await prisma.salesForecast.findMany({
            where: { type: 'monthly' },
            orderBy: { period: 'asc' }
        });
        if (!forecasts.length) return [];
        const revData = forecasts.map(f => f.expectedRevenue || 0);
        return salesMath.calculateEMA(revData, 3);
    }

    // [21] Market Basket Analysis
    static async performMarketBasketAnalysis() {
        // Concept/placeholder: assume Opportunity has a tags array representing products (stored in JSON or relation)
        const wonDeals = await prisma.lead.findMany({
            where: { stage: 'ClosedWon' }
        });
        const baskets = wonDeals
            .filter(d => d.tags && Array.isArray(d.tags) && d.tags.length > 0)
            .map(d => d.tags);
        return salesMath.getFrequentPairs(baskets, 0.1);
    }

    // [22] Cosine Similarity (Lookalikes)
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

    // ------------------------------------------------------------------------
    // [23-25] Anomalies, Territories, Action Items
    // ------------------------------------------------------------------------

    // [23] Activity Pattern Alerting
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

    // [24] Territory Optimization
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

    // [25] Keyword Action Item Detection
    static extractActionItemsFromTranscription(text) {
        return salesMath.extractActionItems(text);
    }
    // ------------------------------------------------------------------------
    // MOVED FROM CONTROLLER
    // ------------------------------------------------------------------------

    static async getDashboardMetrics(userId, companyId, timeframe = 'month') {
        const Settings = prisma.settings;
        const Lead = prisma.deal;
        const Opportunity = prisma.lead;
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
            this.calculateWeightedForecast(companyPrisma, currentMonth).catch(() => null),
            this.calculateFunnelConversion(companyPrisma).catch(() => null),
            this.calculateDashboardCharts(companyPrisma, userId, timeframe).catch(() => null),
            this.calculateSalesCycleLength(companyPrisma).catch(() => null),
            this.calculateRepProductivity(companyPrisma, userId, settings).catch(() => null),
            this.detectChurnStagnation(companyPrisma).catch(() => null),
            this.detectStagnantOpportunities(companyPrisma, 14).catch(() => null),
            Lead.count({ where: { deletedAt: null, status: { not: 'converted' }, ...dateFilter } }).catch(() => 0),
            Opportunity.count({ where: { stage: { notIn: ['ClosedWon', 'ClosedLost'] }, ...(startDate ? { createdAt: { gte: startDate } } : {}) } }).catch(() => 0),
            Account.count({ where: dateFilter }).catch(() => 0),
            Opportunity.aggregate({ where: { stage: 'ClosedWon', ...(startDate ? { expectedCloseDate: { gte: startDate } } : {}) }, _sum: { value: true } }).then(res => [{ total: res._sum?.value || 0 }]).catch(() => []),
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
                    relatedClient: { select: { id: true, name: true, company: true, source: true } }
                }
            }).catch(() => []),
            Lead.count({ where: { deletedAt: null, status: { in: ['new', 'pending'] }, ...dateFilter } }).catch(() => 0),
            Lead.count({ where: { deletedAt: null, status: { notIn: ['new', 'pending', 'lost', 'rejected', 'archived', 'converted'] }, ...dateFilter } }).catch(() => 0),
            Opportunity.count({ where: dateFilter }).catch(() => 0),
            Opportunity.count({ where: { stage: 'ClosedWon', ...oppDateFilter } }).catch(() => 0),
            Lead.aggregate({ where: { deletedAt: null, status: { notIn: ['lost', 'rejected', 'archived', 'converted'] }, ...dateFilter }, _sum: { value: true } }).then(res => [{ total: res._sum?.value || 0 }]).catch(() => []),
            Opportunity.aggregate({ where: { stage: { notIn: ['ClosedWon', 'ClosedLost'] }, ...dateFilter }, _sum: { value: true } }).then(res => [{ total: res._sum?.value || 0 }]).catch(() => [])
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


    static async getProductivity(userId) {
        const User = prisma.user;
        const allReps = await User.findMany({ where: { role: { in: ['admin', 'sales', 'manager'] } } });
        

        const leaderboard = [];
        for (const rep of allReps) {
            const [dealsClosed, revenue, activities] = await Promise.all([
                prisma.lead.count({ where: { ownerId: rep.id, stage: 'ClosedWon' } }),
                prisma.lead.aggregate({ where: { ownerId: rep.id, stage: 'ClosedWon' }, _sum: { value: true } }).then(res => [{ total: res._sum.value || 0 }]),
                prisma.salesActivity.count({ where: { ownerId: rep.id } })
            ]);

            const revValue = revenue.length ? revenue[0].total : 0;
            const score = CrmCalculationService.calculateRepProductivity(dealsClosed, revValue, activities);

            leaderboard.push({ id: rep.id, name: rep.name, email: rep.email, score, dealsClosed });
        }
        leaderboard.sort((a, b) => b.score - a.score);

        const suggestedRepId = await this.suggestRepForLead(companyPrisma);
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

    // ------------------------------------------------------------------------
    // LEADS
    // ------------------------------------------------------------------------

    static async getLeads(page = 1, limit = 100) {
        const skip = (page - 1) * limit;
        const Lead = prisma.deal;
        
        const leads = await Lead.findMany({
            include: { assignedSalesRep: { select: { name: true, email: true } } },
            orderBy: { leadScore: 'desc' },
            skip: skip,
            take: limit
        });

        const total = await Lead.count();
        return { leads, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
    }

    static async createLead(leadData, userId) {
        const Lead = prisma.deal;
        const lead = await Lead.create({ data: leadData });

        await prisma.salesActivity.create({ data: {
            type: 'note',
            dealId: lead.id,
            notes: `New lead created: ${lead.name} from ${lead.company}`,
            ownerId: userId
        } });

        const settings = await prisma.settings.findFirst();
        
        const newScore = CrmCalculationService.scoreLead(lead, settings?.salesConfig?.leadScoring);
        await Lead.update({ where: { id: lead.id }, data: { leadScore: newScore } });

        
        await SalesRuleEngine.onLeadCreated(companyPrisma, lead.id);

        try {
            
            await triggerN8nWebhook('new-lead', {
                leadId: lead.id,
                name: lead.name,
                company: lead.company,
                assignedSalesRep: lead.assignedSalesRep
            });
        } catch (err) {}

        return lead;
    }

    static async importLeads(leads, userId) {
        if (!Array.isArray(leads) || leads.length === 0) {
            throw new Error('No leads provided');
        }

        const Lead = prisma.deal;
        const newLeads = leads.map(l => ({
            ...l,
            assignedSalesRep: l.assignedSalesRep || userId,
        }));

        const inserted = await Lead.createMany({ data: newLeads });
        const settings = await prisma.settings.findFirst();
        
        

        // Note: Using findMany to get the inserted leads for scoring/triggers would be better, 
        // but skipping for now to match old behavior exactly.
        
        return inserted.length;
    }

    static async updateLead(id, updateData) {
        const Lead = prisma.deal;
        
        let lead = await Lead.findUnique({ where: { id } });
        if (!lead) throw new Error('Lead not found');

        const oldLead = lead;

        lead = await Lead.update({
            where: { id },
            data: updateData
        });

        // Track value or status changes in SalesActivity
        const activitiesToCreate = [];
        if (updateData.value !== undefined && oldLead.value !== updateData.value) {
            activitiesToCreate.push({
                type: 'note',
                leadId: lead.id,
                notes: `Lead value updated from â‚¹${oldLead.value || 0} to â‚¹${updateData.value || 0}`,
                ownerId: lead.assignedSalesRepId
            });
        }
        if (updateData.status !== undefined && oldLead.status !== updateData.status) {
            activitiesToCreate.push({
                type: 'note',
                leadId: lead.id,
                notes: `Lead status changed from ${oldLead.status} to ${updateData.status}`,
                ownerId: lead.assignedSalesRepId
            });
        }
        
        if (activitiesToCreate.length > 0) {
            try {
                await prisma.salesActivity.createMany({ data: activitiesToCreate });
            } catch (actErr) {
                console.error('Failed to create sales activity for lead update', actErr);
            }
        }

        try {
            const settings = await prisma.settings.findFirst();
            await this.calculateLeadScore(companyPrisma, lead, settings);
        } catch (scoringErr) {}

        try {
            
            triggerN8nWebhook('update-lead', {
                leadId: lead.id,
                name: lead.name,
                company: lead.company,
                status: lead.status,
                assignedSalesRep: lead.assignedSalesRep
            });
        } catch (err) {}

        return lead;
    }

    static async deleteLead(id) {
        await prisma.salesActivity.deleteMany({ where: { dealId: id } });
        await prisma.salesTask.deleteMany({ where: { dealId: id } });
        await prisma.deal.delete({ where: { id } });
    }

    static async convertLead(id, userId) {
        const Lead = prisma.deal;
        const Account = prisma.salesAccount;
        const Contact = prisma.contact;
        const Opportunity = prisma.lead;

        const lead = await Lead.findUnique({ where: { id } });
        if (!lead) throw new Error('Lead not found');
        if (lead.status === 'converted') throw new Error('This lead has already been converted.');

        // Use interactive transaction
        return await prisma.$transaction(async (prisma) => {
            let account = await prisma.salesAccount.findFirst({ where: { companyName: { equals: lead.company.trim(), mode: 'insensitive' } } });
            
            if (!account) {
                account = await prisma.salesAccount.create({ data: {
                    companyName: lead.company.trim(),
                    industry: lead.industry,
                    employeeCount: lead.companySize,
                    assignedManager: userId
                } });
            }

            let contact = await prisma.contact.findFirst({ where: { 
                accountId: account.id,
                OR: [
                    { email: lead.email },
                    { name: lead.name }
                ]
            } });

            if (!contact) {
                contact = await prisma.contact.create({ data: {
                    accountId: account.id,
                    name: lead.name,
                    email: lead.email,
                    phone: lead.phone
                } });
            }

            const opp = await prisma.opportunity.create({ data: {
                title: `Deal with ${lead.company}`,
                accountId: account.id,
                contactId: contact.id,
                leadId: lead.id,
                value: lead.value || 0,
                stage: 'Qualified',
                owner: userId,
                priorityScore: (lead.leadScore || 0)
            } });

            await prisma.lead.update({ where: { id: lead.id }, data: { status: 'converted' } });

            await prisma.salesActivity.create({ data: {
                type: 'task',
                relatedLead: lead.id,
                relatedAccount: account.id,
                relatedContact: contact.id,
                relatedDeal: opp.id,
                notes: `Converted lead into account and opportunity: ${opp.title}`,
                owner: userId
            } });

            return { account, contact, opportunity: opp };
        });
    }

    // ------------------------------------------------------------------------
    // CONTRACTS & AI
    // ------------------------------------------------------------------------

    static async analyzeContract(text) {
        if (!text) throw new Error('Contract text is required');

        const prompt = `
            Act as an advocate lawyer of the Supreme Court with 15 years of experience in contract analysis and creation for large corporations.
            Analyze the following client contract text and extract key information into a structured JSON format.
            Be extremely thorough in identifying any hidden constraints or potential issues for my company.
            The JSON MUST strictly have the following keys (no extra text):
            - "title": A concise title for the contract.
            - "parties": Array of strings representing the involved parties.
            - "value": The total monetary value mentioned, as a string or number.
            - "dates": Object with "effectiveDate" and "expirationDate".
            - "keyObligations": Array of 3-5 strings detailing main obligations.
            - "risks": Array of strings detailing potential issues, hidden terms, and constraints.

            Contract Text:
            """${text.substring(0, 10000)}"""
        `;

        const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAPI_KEY;
        if (!apiKey) {
            throw new Error('OpenAI API key is missing. Cannot perform contract analysis.');
        }

        const { OpenAI } = require('openai');
        const openai = new OpenAI({ apiKey });

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.2
        });

        let resultText = response.choices[0].message.content;
        if (resultText.startsWith('```json')) {
            resultText = resultText.replace(/```json/g, '').replace(/```/g, '');
        }

        return JSON.parse(resultText);
    }

    static async proposeContractUpdates(text, updates) {
        if (!text || !updates) throw new Error('Contract text and proposed updates context are required');

        const prompt = `
            Act as an advocate lawyer of the Supreme Court with 15 years of experience in contract creation for large corporations.
            The user wants you to propose amendments to the following client contract based on their desired updates.
            
            Desired Updates / Instructions:
            """${updates}"""

            Original Contract Text:
            """${text.substring(0, 10000)}"""
            
            Return ONLY a valid JSON object strictly with the following keys:
            - "proposedChanges": Detailed explanation of what was changed and why it protects the company.
            - "updatedContractText": The full, legally sound revised contract text incorporating the updates.
        `;

        const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAPI_KEY;
        if (!apiKey) {
            throw new Error('OpenAI API key is missing. Cannot propose contract updates.');
        }

        const { OpenAI } = require('openai');
        const openai = new OpenAI({ apiKey });

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3
        });

        let resultText = response.choices[0].message.content;
        if (resultText.startsWith('```json')) resultText = resultText.replace(/```json/g, '').replace(/```/g, '');

        return JSON.parse(resultText);
    }

    static async createContractWithAI(company, instructions, clientId) {
        if (!instructions) throw new Error('Instructions are required');

        let clientContext = '';
        let clientObj = null;
        if (clientId) {
            const Lead = prisma.deal;
            const Account = prisma.salesAccount;
            const Contact = prisma.contact;
            
            clientObj = await Lead.findUnique({ where: { id: clientId } }) || await Account.findUnique({ where: { id: clientId } }) || await Contact.findUnique({ where: { id: clientId } });
            
            if (clientObj) {
                clientContext = `
                CRITICAL INSTRUCTION: You MUST incorporate the following explicit client details naturally into the generated contract. Do not use generic placeholders for these fields:
                Client Representative Name: ${clientObj.name || clientObj.leadName || ''}
                Client Company: ${clientObj.company || ''}
                Client Email: ${clientObj.email || ''}
                Client Phone: ${clientObj.phone || ''}
                `;
            }
        }

        const companyContext = `
        CRITICAL INSTRUCTION: You MUST incorporate the following details representing OUR COMPANY into the contract. We are the provider:
        Company Name: ${company?.companyName || '180workspace Master Entity'}
        Company Contact Email: ${company?.adminEmail || ''}
        Company Website: ${company?.website || ''}
        `;

        const prompt = `
            Act as an advocate lawyer of the Supreme Court with 15 years of experience in contract drafting.
            The user wants you to draft a new, formal, legally-sound contract from scratch based on their instructions.

            ${companyContext}
            
            ${clientContext}

            User's Custom Requirements:
            """${instructions}"""
            
            Return ONLY a valid JSON object strictly with the following keys. Do not include markdown formatting:
            - "contractTitle": A professional title for the document.
            - "contractText": The full, generated legal agreement spanning multiple paragraphs. Ensure you use the provided Company and Client data instead of brackets like [Client Name].
        `;

        if (!process.env.OPENAPI_KEY && !process.env.OPENAI_API_KEY) {
            return {
                contractTitle: "Custom Legal Agreement",
                contractText: `THIS AGREEMENT is made effective as of today.\n\nBETWEEN:\n${company?.companyName || 'Our Company'} AND ${clientObj?.name || 'The Client'}\n\nBased on your instructions: ${instructions}`
            };
        }

        const { Configuration, OpenAIApi } = require('openai');
        const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY || process.env.OPENAPI_KEY });
        const openai = new OpenAIApi(configuration);

        const response = await openai.createChatCompletion({
            model: "gpt-3.5-turbo-16k",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3
        });

        let resultText = response.data.choices[0].message.content;
        if (resultText.startsWith('```json')) {
            resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
        }

        return JSON.parse(resultText);
    }

    static async getClientObjForContract(clientId) {
        if (!clientId) return null;
        const Lead = prisma.deal;
        const Account = prisma.salesAccount;
        const Contact = prisma.contact;
        return await Lead.findUnique({ where: { id: clientId } }) || await Account.findUnique({ where: { id: clientId } }) || await Contact.findUnique({ where: { id: clientId } });
    }

    static async emailContract(company, userId, userName, contractTitle, contractText, clientId, email) {
        if (!contractText || (!clientId && !email)) {
            throw new Error('Contract text and a recipient email or client selection is required.');
        }

        const Settings = prisma.settings;
        const settings = await Settings.findFirst();
        if (!settings || !settings.smtpHost) throw new Error('SMTP Settings are not configured.');

        let clientObj = null;
        let recipientEmail = email;

        if (clientId) {
            clientObj = await this.getClientObjForContract(companyPrisma, clientId);
            if (clientObj && !recipientEmail) recipientEmail = clientObj.email;
        }

        if (!recipientEmail) throw new Error('No recipient email found.');

        
        const doc = new PDFDocument({ margin: 50 });
        
        let chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        pdfUtils.generateContractPDF(doc, { contractTitle, contractText }, company, clientObj);
        doc.end();

        const pdfBuffer = await new Promise((resolve) => {
            doc.on('end', () => resolve(Buffer.concat(chunks)));
        });

        
        const result = await emailService.sendGenericEmail(recipientEmail, 
            `${company?.companyName || '180workspace'} - ${contractTitle || 'Legal Agreement'}`,
            `Hello,\n\nPlease find the attached ${contractTitle || 'document'} prepared for you by ${company?.companyName || 'our team'}.\n\nBest regards,\n${userName}`,
            [
                {
                    filename: `${contractTitle ? contractTitle.replace(/\s+/g, '_') : 'Contract'}.pdf`,
                    content: pdfBuffer
                }
            ], 
            companyPrisma
        );

        if (!result.success) throw new Error('Failed to send email');

        await prisma.salesActivity.create({ data: {
            type: 'email',
            relatedContact: clientObj?.id || null,
            notes: `Sent Contract: ${contractTitle} to ${recipientEmail}`,
            owner: userId
        } });

        return { message: 'Contract emailed successfully to ' + recipientEmail };
    }

    // ------------------------------------------------------------------------
    // OPPORTUNITIES
    // ------------------------------------------------------------------------

    static async getOpportunities(page = 1, limit = 100, pipelineType) {
        const skip = (page - 1) * limit;
        const Opportunity = prisma.lead;
        
        const whereClause = {};
        if (pipelineType) {
            whereClause.pipelineType = pipelineType;
        }

        const opportunities = await Opportunity.findMany({ 
            where: whereClause,
            include: { owner: { select: { name: true, email: true } }, client: true }, 
            orderBy: { priorityScore: 'desc' },
            skip: skip,
            take: limit
        });

        const total = await Opportunity.count({ where: whereClause });
        return { opportunities, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
    }

    static async createOpportunity(data, userId) {
        const Opportunity = prisma.lead;
        
        const followUpDate = data.followUpDate;
        const followUpTime = data.followUpTime;
        const notes = data.notes;
        
        delete data.followUpDate;
        delete data.followUpTime;
        delete data.notes;

        if (data.owner) {
            data.ownerId = data.owner;
        } else {
            data.ownerId = userId;
        }
        delete data.owner;
        
        if (data.expectedCloseDate) {
            data.expectedCloseDate = new Date(data.expectedCloseDate).toISOString();
        }

        if (!data.clientId && (data.companyName || data.contactEmail)) {
            const Client = prisma.client;
            let client = null;
            if (data.companyName) {
                client = await Client.findFirst({ where: { companyName: data.companyName } });
            }
            if (!client && data.contactEmail) {
                client = await Client.findFirst({ where: { email: data.contactEmail } });
            }

            if (!client) {
                client = await Client.create({
                    data: {
                        name: data.contactName || data.companyName || 'Unknown Lead',
                        companyName: data.companyName || null,
                        email: data.contactEmail || null,
                        phone: data.contactPhone || null,
                        industry: data.industry || null,
                        clientType: data.clientType || 'Lead',
                        status: 'active',
                        website: data.website || null,
                        taxId: data.taxId || null,
                        billingAddress: data.billingAddress || null,
                        location: data.location || null,
                        employeeCount: data.employeeCount || null,
                        annualRevenue: data.annualRevenue ? parseFloat(data.annualRevenue) : 0,
                        customIndustry: data.customIndustry || null,
                        country: data.country || null
                    }
                });
            }
            data.clientId = client.id;
        }
        delete data.contactName;
        delete data.contactEmail;
        delete data.contactPhone;
        delete data.companyName;
        delete data.industry;
        delete data.clientType;
        delete data.website;
        delete data.taxId;
        delete data.billingAddress;
        delete data.location;
        delete data.employeeCount;
        delete data.annualRevenue;
        delete data.customIndustry;
        delete data.country;
        
        const opp = await Opportunity.create({ data: { ...data } });

        if (notes) {
            await prisma.salesActivity.create({ data: {
                type: 'note',
                leadId: opp.id,
                relatedClientId: opp.clientId,
                notes: notes,
                ownerId: userId
            } });
        }

        if (followUpDate) {
            let combinedDate = followUpDate;
            if (followUpTime) combinedDate += 'T' + followUpTime;
            await prisma.salesTask.create({
                data: {
                    description: `Follow up on deal: ${opp.title}`,
                    dueDate: new Date(combinedDate),
                    assignedTo: opp.ownerId || userId,
                    leadId: opp.id,
                }
            });
        }


        await prisma.salesActivity.create({ data: {
            type: 'task',
            leadId: opp.id,
            relatedClientId: opp.clientId,
            notes: `New opportunity created: ${opp.title}`,
            ownerId: userId
        } });

        const settings = await prisma.settings.findFirst();
        
        opp.probability = CrmCalculationService.calculateWinProbability(opp.stage, opp.engagementScore, settings?.salesConfig?.opportunityStages);
        
        await Opportunity.update({ where: { id: opp.id }, data: { probability: opp.probability } });

        return opp;
    }

    static async updateOpportunity(id, data, companyId) {
        const Opportunity = prisma.lead;
        const Deal = prisma.deal;
        const oldOpp = await Opportunity.findUnique({ where: { id }, include: { client: true } });
        if (!oldOpp) throw new Error('Opportunity not found');

        if (data.convertToDeal) {
            data.pipelineType = 'ACTIVE_CLIENT';
            const dealData = {
                name: oldOpp.client?.name || oldOpp.title,
                email: oldOpp.client?.email || '',
                phone: oldOpp.client?.phone || '',
                company: oldOpp.client?.companyName || '',
                industry: oldOpp.client?.industry || '',
                source: oldOpp.source || 'outbound',
                status: 'kickoff',
                value: oldOpp.value || 0,
            };
            if (oldOpp.ownerId) {
                dealData.assignedSalesRep = { connect: { id: oldOpp.ownerId } };
            }
            
            const newDeal = await Deal.create({
                data: dealData
            });
            
            await prisma.salesActivity.create({
                data: {
                    type: 'note',
                    dealId: newDeal.id,
                    notes: `Automatically created from won lead: ${oldOpp.title}`,
                    ownerId: oldOpp.ownerId
                }
            });
            
            delete data.convertToDeal;
        }

        if (data.owner) {
            data.ownerId = data.owner;
            delete data.owner;
        }

        const followUpDate = data.followUpDate;
        const followUpTime = data.followUpTime;
        const notes = data.notes;
        
        delete data.followUpDate;
        delete data.followUpTime;
        delete data.notes;

        if (data.expectedCloseDate) {
            data.expectedCloseDate = new Date(data.expectedCloseDate).toISOString();
        }

        if (data.contactName !== undefined || data.contactEmail !== undefined || data.contactPhone !== undefined || data.companyName !== undefined || data.industry !== undefined || data.location !== undefined || data.clientType !== undefined || data.website !== undefined || data.taxId !== undefined || data.billingAddress !== undefined || data.employeeCount !== undefined || data.annualRevenue !== undefined || data.customIndustry !== undefined || data.country !== undefined) {
            if (oldOpp.clientId) {
                await prisma.client.update({
                    where: { id: oldOpp.clientId },
                    data: {
                        name: data.contactName !== undefined ? data.contactName : undefined,
                        email: data.contactEmail !== undefined ? data.contactEmail : undefined,
                        phone: data.contactPhone !== undefined ? data.contactPhone : undefined,
                        companyName: data.companyName !== undefined ? data.companyName : undefined,
                        industry: data.industry !== undefined ? data.industry : undefined,
                        location: data.location !== undefined ? data.location : undefined,
                        clientType: data.clientType !== undefined ? data.clientType : undefined,
                        website: data.website !== undefined ? data.website : undefined,
                        taxId: data.taxId !== undefined ? data.taxId : undefined,
                        billingAddress: data.billingAddress !== undefined ? data.billingAddress : undefined,
                        employeeCount: data.employeeCount !== undefined ? data.employeeCount : undefined,
                        annualRevenue: data.annualRevenue !== undefined ? parseFloat(data.annualRevenue) : undefined,
                        customIndustry: data.customIndustry !== undefined ? data.customIndustry : undefined,
                        country: data.country !== undefined ? data.country : undefined,
                    }
                });
            } else if (data.companyName || data.contactEmail || data.contactName) {
                const Client = prisma.client;
                let client = null;
                if (data.companyName) {
                    client = await Client.findFirst({ where: { companyName: data.companyName } });
                }
                if (!client && data.contactEmail) {
                    client = await Client.findFirst({ where: { email: data.contactEmail } });
                }

                if (!client) {
                    client = await Client.create({
                        data: {
                            name: data.contactName || data.companyName || 'Unknown Lead',
                            companyName: data.companyName || null,
                            email: data.contactEmail || null,
                            phone: data.contactPhone || null,
                            industry: data.industry || null,
                            clientType: data.clientType || 'Lead',
                            status: 'active',
                            website: data.website || null,
                            taxId: data.taxId || null,
                            billingAddress: data.billingAddress || null,
                            location: data.location || null,
                            employeeCount: data.employeeCount || null,
                            annualRevenue: data.annualRevenue ? parseFloat(data.annualRevenue) : 0,
                            customIndustry: data.customIndustry || null,
                            country: data.country || null
                        }
                    });
                } else {
                    // Update existing client with new info
                    await Client.update({
                        where: { id: client.id },
                        data: {
                            name: data.contactName !== undefined ? data.contactName : undefined,
                            phone: data.contactPhone !== undefined ? data.contactPhone : undefined,
                            industry: data.industry !== undefined ? data.industry : undefined,
                            location: data.location !== undefined ? data.location : undefined,
                            clientType: data.clientType !== undefined ? data.clientType : undefined,
                            website: data.website !== undefined ? data.website : undefined,
                            taxId: data.taxId !== undefined ? data.taxId : undefined,
                            billingAddress: data.billingAddress !== undefined ? data.billingAddress : undefined,
                            employeeCount: data.employeeCount !== undefined ? data.employeeCount : undefined,
                            annualRevenue: data.annualRevenue !== undefined ? parseFloat(data.annualRevenue) : undefined,
                            customIndustry: data.customIndustry !== undefined ? data.customIndustry : undefined,
                            country: data.country !== undefined ? data.country : undefined,
                        }
                    });
                }
                data.clientId = client.id;
            }
        }
        delete data.contactName;
        delete data.contactEmail;
        delete data.contactPhone;
        delete data.companyName;
        delete data.industry;
        delete data.location;
        delete data.clientType;
        delete data.website;
        delete data.taxId;
        delete data.billingAddress;
        delete data.employeeCount;
        delete data.annualRevenue;
        delete data.customIndustry;
        delete data.country;
        
        let justWon = false;
        if (data.convertToDeal || (data.stage === 'ClosedWon' && oldOpp.stage !== 'ClosedWon')) {
            justWon = true;
        }

        const opp = await Opportunity.update({ where: { id }, data });
        
        if (justWon && companyId) {
            const clientRecord = oldOpp.client || await prisma.client.findUnique({ where: { id: opp.clientId } });
            if (clientRecord && clientRecord.email) {
                const User = prisma.user;
                const existingUser = await User.findFirst({ where: { email: clientRecord.email } });
                if (!existingUser) {
                    try {
                        const crypto = require('crypto');
                        const bcrypt = require('bcryptjs');
                        
                        
                        const generatedPassword = crypto.randomBytes(8).toString('hex');
                        const salt = await bcrypt.genSalt(10);
                        const hashedPassword = await bcrypt.hash(generatedPassword, salt);
                        
                        const clientUser = await User.create({
                            data: {
                                name: clientRecord.name || 'Client',
                                email: clientRecord.email,
                                password: hashedPassword,
                                role: 'client',
                                isActive: true
                            }
                        });

                        await emailService.EmailService.sendWelcomeEmail(clientUser, generatedPassword, companyPrisma);
                    } catch (err) {
                        console.error('Failed to create client user or send email on win:', err);
                    }
                }
            }
        }

        // Track value or stage changes in SalesActivity
        const activitiesToCreate = [];
        if (data.value !== undefined && oldOpp.value !== data.value) {
            activitiesToCreate.push({
                type: 'note',
                leadId: opp.id,
                notes: `Deal value updated from â‚¹${oldOpp.value || 0} to â‚¹${data.value || 0}`,
                ownerId: opp.ownerId
            });
        }
        if (data.stage !== undefined && oldOpp.stage !== data.stage) {
            activitiesToCreate.push({
                type: 'note',
                leadId: opp.id,
                notes: `Deal stage changed from ${oldOpp.stage} to ${data.stage}`,
                ownerId: opp.ownerId
            });
        }
        
        if (activitiesToCreate.length > 0) {
            try {
                await prisma.salesActivity.createMany({ data: activitiesToCreate });
            } catch (actErr) {
                console.error('Failed to create sales activity for deal update', actErr);
            }
        }

        if (notes) {
            await prisma.salesActivity.create({ data: {
                type: 'note',
                leadId: opp.id,
                relatedClientId: opp.clientId,
                notes: notes,
                ownerId: opp.ownerId
            } });
        }

        if (followUpDate) {
            let combinedDate = followUpDate;
            if (followUpTime) combinedDate += 'T' + followUpTime;
            await prisma.salesTask.create({
                data: {
                    description: `Follow up on deal: ${opp.title}`,
                    dueDate: new Date(combinedDate),
                    assignedTo: opp.ownerId,
                    leadId: opp.id,
                }
            });
        }

        const settings = await prisma.settings.findFirst();
        
        opp.probability = CrmCalculationService.calculateWinProbability(opp.stage, opp.engagementScore, settings?.salesConfig?.opportunityStages);
        
        await Opportunity.update({ where: { id: opp.id }, data: { probability: opp.probability } });

        let message = 'Opportunity updated successfully';
        if (data.stage === 'ClosedWon' && oldOpp.stage !== 'ClosedWon' && !opp.projectId) {
            message = 'Opportunity marked as Closed Won and converted to Deal. You can now convert it to a project.';
        }

        return { opportunity: opp, message };
    }

    static async createProjectFromOpportunity(id, userId) {
        const Opportunity = prisma.lead;
        const Project = prisma.project;

        const opp = await Opportunity.findUnique({ where: { id } });
        if (!opp) throw new Error('Opportunity not found');

        if (opp.projectId) {
            throw new Error('Project already exists for this opportunity');
        }

        const project = await Project.create({ data: {
            name: opp.title,
            description: `Project created from CRM Opportunity: ${opp.title}`,
            status: 'Proposed',
            budget: opp.value || 0,
            ownerId: userId,
            accountId: opp.accountId,
            opportunityId: opp.id,
            memberIds: [userId],
            clientIds: [] 
        } });

        const updatedOpp = await Opportunity.update({ where: { id }, data: { projectId: project.id } });

        return { project, opportunity: updatedOpp };
    }

    static async deleteOpportunity(id) {
        const Opportunity = prisma.lead;
        await prisma.salesActivity.deleteMany({ where: { leadId: id } });
        await prisma.salesTask.deleteMany({ where: { leadId: id } });
        const opp = await Opportunity.delete({ where: { id } });
        if (!opp) throw new Error('Opportunity not found');
        return opp;
    }

    // ------------------------------------------------------------------------
    // ACCOUNTS & CONTACTS
    // ------------------------------------------------------------------------

    static async getAccounts(page = 1, limit = 100) {
        const skip = (page - 1) * limit;
        const Account = prisma.salesAccount;
        const accountsRaw = await Account.findMany({
            orderBy: { clv: 'desc' },
            skip: skip,
            take: limit
        });

        const Opportunity = prisma.lead;
        const Contact = prisma.contact;
        const moment = require('moment');
        

        const accounts = await Promise.all(accountsRaw.map(async acc => {
            const [lostDeals, staleContacts] = await Promise.all([
                Opportunity.count({ where: { accountId: acc.id, stage: 'ClosedLost' } }),
                Contact.count({ where: {
                    accountId: acc.id,
                    lastContacted: { lt: moment().subtract(60, 'days').toDate() }
                } })
            ]);

            const riskIndex = CrmCalculationService.calculateCustomerRiskIndex(lostDeals, staleContacts);
            let healthStatus = 'Healthy';
            if (riskIndex > 60) healthStatus = 'At Risk';
            if (riskIndex > 90) healthStatus = 'Churned';

            return { ...acc, riskIndex, healthStatus };
        }));

        const total = await Account.count();
        return { accounts, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
    }

    static async createAccount(data, userId) {
        const Account = prisma.salesAccount;
        const account = await Account.create({ data: {
            ...data,
            assignedManager: userId
        } });
        return account;
    }

    static async updateAccount(id, data) {
        const Account = prisma.salesAccount;
        const account = await Account.update({ where: { id }, data });
        if (!account) throw new Error('Account not found');
        return account;
    }

    static async deleteAccount(id) {
        const Account = prisma.salesAccount;
        const account = await Account.delete({ where: { id } });
        if (!account) throw new Error('Account not found');
        return account;
    }

    static async getContacts(page = 1, limit = 100) {
        const skip = (page - 1) * limit;
        const Contact = prisma.contact;
        const contacts = await Contact.findMany({
            include: { accountId: { select: { companyName: true } } },
            skip: skip,
            take: limit
        });

        const total = await Contact.count();
        return { contacts, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
    }

    static async getContact(id) {
        const Contact = prisma.contact;
        const contact = await Contact.findUnique({ 
            where: { id },
            include: { accountId: { select: { companyName: true, clv: true, industry: true } } }
        });

        if (!contact) throw new Error('Contact not found');

        const Opportunity = prisma.lead;
        const opportunities = await Opportunity.findMany({
            where: { accountId: contact.accountId },
            select: { title: true, value: true, stage: true, probability: true, expectedCloseDate: true }
        });

        const SalesActivity = prisma.salesActivity;
        const activities = await SalesActivity.findMany({
            where: {
                OR: [
                    { relatedAccount: contact.accountId },
                    { relatedContact: contact.id }
                ]
            },
            include: { owner: { select: { name: true } } },
            orderBy: { timestamp: 'desc' },
            take: 20
        });

        return { contact, opportunities, activities };
    }

    static async createContact(data) {
        const Contact = prisma.contact;

        if (data.email) {
            const existingByEmail = await Contact.findFirst({ where: { email: data.email.trim().toLowerCase() } });
            if (existingByEmail) {
                const err = new Error('A contact with this email already exists.');
                err.status = 400;
                err.duplicateId = existingByEmail.id;
                throw err;
            }
        }

        if (data.accountId && data.name) {
            const existingByName = await Contact.findFirst({ where: {
                accountId: data.accountId,
                name: { equals: data.name.trim(), mode: 'insensitive' }
            } });
            if (existingByName) {
                const err = new Error('A contact with this name already exists in this account.');
                err.status = 400;
                err.duplicateId = existingByName.id;
                throw err;
            }
        }

        const contact = await Contact.create({ data });
        return contact;
    }

    static async updateContact(id, data) {
        const Contact = prisma.contact;
        const contact = await Contact.update({ where: { id }, data });
        if (!contact) throw new Error('Contact not found');
        return contact;
    }

    static async deleteContact(id) {
        const Contact = prisma.contact;
        const contact = await Contact.delete({ where: { id } });
        if (!contact) throw new Error('Contact not found');
        return contact;
    }

    // ------------------------------------------------------------------------
    // ACTIVITIES
    // ------------------------------------------------------------------------

    static async getActivities(page = 1, limit = 100) {
        const skip = (page - 1) * limit;
        const SalesActivity = prisma.salesActivity;
        const activities = await SalesActivity.findMany({
            include: { 
                relatedLead: { select: { name: true, company: true } },
                relatedDeal: { select: { title: true, value: true } },
                relatedAccount: { select: { companyName: true } },
                relatedContact: { select: { name: true, email: true } },
                owner: { select: { name: true } }
            },
            orderBy: { timestamp: 'desc' },
            skip: skip,
            take: limit
        });

        const total = await SalesActivity.count();
        return { activities, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
    }

    static async createActivity(data, userId) {
        const SalesActivity = prisma.salesActivity;
        const activity = await SalesActivity.create({ data: {
            ...data,
            owner: userId
        } });

        const populatedActivity = await SalesActivity.findUnique({ 
            where: { id: activity.id },
            include: { 
                relatedLead: { select: { name: true, company: true } },
                relatedDeal: { select: { title: true, value: true } },
                relatedAccount: { select: { companyName: true } },
                relatedContact: { select: { name: true, email: true } },
                owner: { select: { name: true } }
            }
        });

        return populatedActivity;
    }

    // ------------------------------------------------------------------------
    // QUOTES
    // ------------------------------------------------------------------------

    static async getQuotes(page = 1, limit = 100) {
        const skip = (page - 1) * limit;
        const Quote = prisma.quote;

        const quotes = await Quote.findMany({
            include: { 
                createdBy: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' },
            skip: skip,
            take: limit
        });

        // Manually populate client and opportunity data
        const Client = prisma.client;
        const Opportunity = prisma.lead;
        
        for (const q of quotes) {
            if (q.clientId) {
                const c = await Client.findUnique({ where: { id: q.clientId } });
                if (c) {
                    q.clientId = { id: c.id, name: c.name, company: c.company, email: c.email };
                }
            }
            if (q.opportunityId) {
                const opp = await Opportunity.findUnique({ where: { id: q.opportunityId } });
                if (opp) {
                    q.opportunityId = { id: opp.id, title: opp.title };
                }
            }
        }

        const total = await Quote.count();
        return { quotes, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
    }

    static async createQuote(data, userId, companyId) {
        const Quote = prisma.quote;
        const quoteNumber = `QT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

        const payload = { ...data };
        if (payload.validUntil) payload.validUntil = new Date(payload.validUntil).toISOString();
        if (payload.createdBy) delete payload.createdBy;
        if (payload.companyId) delete payload.companyId;
        if (payload.taxTotal !== undefined) {
            payload.tax = payload.taxTotal;
            delete payload.taxTotal;
        }

        const quote = await Quote.create({ data: {
            ...payload,
            quoteNumber,
            companyId,
            createdById: userId
        } });

        return quote;
    }

    static async updateQuote(id, data) {
        const Quote = prisma.quote;
        const payload = { ...data };
        if (payload.validUntil) payload.validUntil = new Date(payload.validUntil);
        if (payload.taxTotal !== undefined) {
            payload.tax = payload.taxTotal;
            delete payload.taxTotal;
        }

        const quote = await Quote.update({ where: { id }, data: payload });
        if (!quote) throw new Error('Quote not found');
        return quote;
    }

    static async deleteQuote(id) {
        const Quote = prisma.quote;
        const quote = await Quote.delete({ where: { id } });
        if (!quote) throw new Error('Quote not found');
        return quote;
    }

    static async getQuoteForPdf(id) {
        const Quote = prisma.quote;
        const Client = prisma.client;
        const quote = await Quote.findUnique({ where: { id } });
        if (!quote) throw new Error('Quote not found');
        if (quote.clientId) {
            const client = await Client.findUnique({ where: { id: quote.clientId } });
            if (client) {
                quote.clientId = { id: client.id, name: client.name, company: client.company, email: client.email };
            }
        }
        return quote;
    }

    static async sendQuoteEmail(id, user, emailOverride, reqCompany) {
        const Settings = prisma.settings;
        const Quote = prisma.quote;
        const Client = prisma.client;
        const PDFDocument = require('pdfkit');
        

        const settings = await Settings.findFirst();
        const hasSmtp = settings && settings.smtpHost && settings.smtpUser && settings.smtpPass;

        if (!hasSmtp) {
            const isAdmin = ['admin', 'superadmin', 'manager'].includes(user.role);
            const message = isAdmin
                ? 'Email configuration missing. Please go to Settings > Email and configure your SMTP settings to enable sending quotes.'
                : 'Email configuration is not set up. Please contact your system administrator to configure SMTP settings.';
            const err = new Error(message);
            err.type = 'SMTP_MISSING';
            err.status = 400;
            throw err;
        }

        const quote = await Quote.findUnique({ where: { id } });
        if (!quote) throw new Error('Quote not found');
        
        if (quote.clientId) {
            const client = await Client.findUnique({ where: { id: quote.clientId } });
            if (client) {
                quote.clientId = { id: client.id, name: client.name, company: client.company, email: client.email };
            }
        }

        const recipientEmail = emailOverride || quote.clientId?.email;
        if (!recipientEmail) {
            const err = new Error('Recipient email is missing. Please provide an email address.');
            err.status = 400;
            throw err;
        }

        const doc = new PDFDocument();
        let chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        
        pdfUtils.generateQuotationPDF(doc, quote, reqCompany);
        doc.end();

        const pdfBuffer = await new Promise((resolve) => {
            doc.on('end', () => resolve(Buffer.concat(chunks)));
        });

        
        const result = await emailService.sendQuotationEmail(recipientEmail, {
            quoteNumber: quote.quoteNumber,
            grandTotal: quote.grandTotal,
            validUntil: new Date(quote.validUntil).toLocaleDateString(),
            userName: user.name,
            clientName: quote.clientId?.name || 'Customer',
            viewUrl: `${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard/sales/quotes/${quote.id}`
        }, [
            {
                filename: `Quote_${quote.quoteNumber}.pdf`,
                content: pdfBuffer
            }
        ], companyPrisma);

        if (!result.success) {
            const err = new Error('Failed to send email: ' + result.error);
            err.status = 500;
            throw err;
        }

        await prisma.salesActivity.create({ data: {
            type: 'email',
            relatedDeal: quote.opportunityId,
            relatedContact: quote.clientId?.id,
            notes: `Sent quotation ${quote.quoteNumber} to ${recipientEmail}`,
            owner: user.id
        } });

        return { message: 'Quotation sent successfully to ' + recipientEmail, quote };
    }

    // ------------------------------------------------------------------------
    // REVENUE STATS
    // ------------------------------------------------------------------------

    static async getRevenueStats(timeframe = 'all') {
        const Opportunity = prisma.lead;
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

        const closedWonAgg = await Opportunity.aggregate({ where: closedWonWhere, _sum: { value: true } });
        const closedWonValue = closedWonAgg._sum.value || 0;

        const rawOpps = await Opportunity.findMany({
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

        const pipelineAgg = await Opportunity.aggregate({ where: openOppsWhere, _sum: { value: true } });
        const pipelineValue = pipelineAgg._sum.value || 0;

        // Group Pipeline by Stage AND Time for graph-based view
        const rawOpenOpps = await Opportunity.findMany({
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
        const pbsRaw = await Opportunity.groupBy({
            by: ['stage'],
            where: openOppsWhere,
            _count: { _all: true },
            _sum: { value: true }
        });
        const pipelineByStage = pbsRaw.map(p => ({ _id: p.stage, count: p._count._all, totalValue: p._sum.value || 0 })).sort((a,b) => b.totalValue - a.totalValue);

        const winLossWhere = { stage: { in: ['ClosedWon', 'ClosedLost'] } };
        if (dateFilter) winLossWhere.expectedCloseDate = dateFilter;

        const winLoss = await Opportunity.groupBy({
            by: ['stage'],
            where: winLossWhere,
            _count: { _all: true }
        });

        let wonCount = 0; let lostCount = 0;
        winLoss.forEach(st => {
            if (st.stage === 'ClosedWon') wonCount = st._count._all;
            if (st.stage === 'ClosedLost') lostCount = st._count._all;
        });

        const topDeals = await Opportunity.findMany({ 
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

        const leadsThisMonth = await prisma.deal.findMany({
            where: { deletedAt: null, createdAt: { gte: startOfMonth, lte: endOfMonth } },
            select: { createdAt: true }
        });

        const oppsThisMonth = await Opportunity.findMany({
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

    static async getSystemSettings() {
        return (await prisma.settings.findFirst({ where: {} })) || {};
    }

    static async getSalesChatContext() {
        const [pipelines, leads] = await Promise.all([
            prisma.opportunity.findMany({ where: { stage: { not: 'ClosedLost' } }, select: { title: true, value: true, stage: true, priorityScore: true } }),
            prisma.lead.findMany({ where: { status: { not: 'Disqualified' } }, select: { name: true, client: { select: { companyName: true } }, leadScore: true } })
        ]);
        return { pipelines, leads };
    }
}






