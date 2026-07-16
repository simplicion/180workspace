'use strict';

const moment = require('moment');
const salesMath = require('../utils/salesMath.js');

class SalesService {
    // ------------------------------------------------------------------------
    // [1-3] Scoring & Forecasting
    // ------------------------------------------------------------------------

    // [1] Lead Scoring: (CompanySize Ã— W1) + (IndustryMatch Ã— W2) + ...
    static async calculateLeadScore(tenantPrisma, leadIdOrDoc, settings) {
        let lead;

        if (typeof leadIdOrDoc === 'string') {
            lead = await tenantPrisma.lead.findUnique({ where: { id: leadIdOrDoc } });
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
            await tenantPrisma.lead.update({
                where: { id: leadIdOrDoc },
                data: { leadScore: calculatedScore }
            });
        } else {
            lead.leadScore = calculatedScore;
        }
        
        return calculatedScore;
    }

    // [2] Win Probability: StageWeight Ã— EngagementScore
    static async calculateWinProbability(tenantPrisma, opportunityId, settings) {
        const opp = await tenantPrisma.opportunity.findUnique({ where: { id: opportunityId } });
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

        await tenantPrisma.opportunity.update({
            where: { id: opportunityId },
            data: { probability: calcProb }
        });
        return calcProb;
    }

    // [3] Weighted Forecast: Î£ (DealValue Ã— WinProbability)
    static async calculateWeightedForecast(tenantPrisma, periodStr) {
        const opps = await tenantPrisma.opportunity.findMany({
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

        await tenantPrisma.salesForecast.upsert({
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
    static async calculateCLV(tenantPrisma, accountId) {
        const wonDeals = await tenantPrisma.opportunity.findMany({
            where: { accountId, stage: 'ClosedWon' }
        });

        if (!wonDeals.length) return 0;
        const avgDealValue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0) / wonDeals.length;
        const dealsPerYear = wonDeals.length;
        const retentionYears = 3;

        const clv = Math.round(avgDealValue * dealsPerYear * retentionYears);
        await tenantPrisma.account.update({
            where: { id: accountId },
            data: { clv }
        });
        return clv;
    }

    // [5] RFM Analysis (Recency, Frequency, Monetary)
    static async segmentAccountsRFM(tenantPrisma) {
        const accounts = await tenantPrisma.account.findMany();

        const segments = [];
        for (let acc of accounts) {
            const deals = await tenantPrisma.opportunity.findMany({
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
    static async calculateFunnelConversion(tenantPrisma) {
        const totalLeads = await tenantPrisma.lead.count() || 1;
        const qualifiedLeads = await tenantPrisma.lead.count({
            where: { status: { in: ['qualified', 'converted'] } }
        });

        const totalProposals = await tenantPrisma.opportunity.count({
            where: { stage: { in: ['Proposal', 'Negotiation', 'ClosedWon', 'ClosedLost'] } }
        }) || 1;
        const wonDeals = await tenantPrisma.opportunity.count({
            where: { stage: 'ClosedWon' }
        });

        return {
            leadConversionRate: (qualifiedLeads / totalLeads) * 100,
            proposalConversionRate: (wonDeals / totalProposals) * 100,
            dealWinRate: (wonDeals / totalProposals) * 100
        };
    }

    // [6b] Dashboard Realtime Charts
    static async calculateDashboardCharts(tenantPrisma) {
        try {
            // Pipeline by stage
            const opps = await tenantPrisma.opportunity.findMany({
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
            const wonOpps = await tenantPrisma.opportunity.findMany({
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

            // 6-month Revenue vs Pipeline Trend
            const months = [];
            for (let i = 5; i >= 0; i--) {
                months.push(moment().subtract(i, 'months').format('YYYY-MM'));
            }

            const trendData = [];
            for (const m of months) {
                const startDate = moment(m, 'YYYY-MM').startOf('month').toDate();
                const endDate = moment(m, 'YYYY-MM').endOf('month').toDate();

                const wonMonth = await tenantPrisma.opportunity.findMany({
                    where: {
                        stage: 'ClosedWon',
                        expectedCloseDate: { gte: startDate, lte: endDate }
                    },
                    select: { value: true }
                });
                const wonTotal = wonMonth.reduce((sum, o) => sum + (o.value || 0), 0);

                const pipeMonth = await tenantPrisma.opportunity.findMany({
                    where: {
                        stage: { notIn: ['ClosedWon', 'ClosedLost'] },
                        expectedCloseDate: { gte: startDate, lte: endDate }
                    },
                    select: { value: true }
                });
                const pipeTotal = pipeMonth.reduce((sum, o) => sum + (o.value || 0), 0);

                trendData.push({
                    name: moment(m, 'YYYY-MM').format('MMM'),
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
    static async calculateSalesCycleLength(tenantPrisma) {
        const wonDeals = await tenantPrisma.opportunity.findMany({
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
    static async findDuplicateLeads(tenantPrisma, leadName, email) {
        const leads = await tenantPrisma.lead.findMany({
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
    static async rankOpportunities(tenantPrisma) {
        const opps = await tenantPrisma.opportunity.findMany({
            where: { stage: { notIn: ['ClosedWon', 'ClosedLost'] } }
        });

        for (const opp of opps) {
            const priorityScore = ((opp.value || 0) * (opp.probability || 0) * (opp.engagementScore || 1)) / 10000;
            await tenantPrisma.opportunity.update({
                where: { id: opp.id },
                data: { priorityScore }
            });
        }

        const updatedOpps = await tenantPrisma.opportunity.findMany({
            where: { stage: { notIn: ['ClosedWon', 'ClosedLost'] } },
            orderBy: { priorityScore: 'desc' }
        });
        return updatedOpps;
    }

    // [10] Churn Risk / Stagnation detection for Accounts
    static async detectChurnStagnation(tenantPrisma) {
        const accountsAtRisk = [];
        const contacts = await tenantPrisma.contact.findMany();

        for (let c of contacts) {
            if (c.lastContacted) {
                const daysSince = moment().diff(moment(c.lastContacted), 'days');
                if (daysSince > 60) accountsAtRisk.push(c.accountId);
            }
        }
        return [...new Set(accountsAtRisk)];
    }

    // [11] Stagnation Detection for Deals
    static async detectStagnantOpportunities(tenantPrisma, thresholdDays = 14) {
        const opps = await tenantPrisma.opportunity.findMany({
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
    static async calculateRepProductivity(tenantPrisma, userId, settings) {
        const config = settings?.salesConfig?.repProductivity || {
            dealsClosedWeight: 0.5, revenueGeneratedWeight: 0.3, activitiesCompletedWeight: 0.2
        };

        const dealsClosed = await tenantPrisma.opportunity.count({
            where: { ownerId: userId, stage: 'ClosedWon' }
        });

        const revenue = await tenantPrisma.opportunity.findMany({
            where: { ownerId: userId, stage: 'ClosedWon' },
            select: { value: true }
        });
        const revValue = revenue.reduce((sum, o) => sum + (o.value || 0), 0);

        const activities = await tenantPrisma.salesActivity.count({
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
    static async suggestRepForLead(tenantPrisma) {
        const leads = await tenantPrisma.lead.findMany({
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
    static async clusterAccountsByValue(tenantPrisma) {
        const accounts = await tenantPrisma.account.findMany({
            where: { clv: { gt: 0 } }
        });
        if (accounts.length < 3) return [];

        const clvs = accounts.map(a => a.clv);
        const clusters = salesMath.simple1DKMeans(clvs, 3);

        return accounts.map((a, idx) => ({ accountId: a.id, clusterId: clusters[idx] }));
    }

    // [15] Logistic Regression Approximation for Win Likelihood
    static async calculateWinLikelihoodLogistic(tenantPrisma, opportunityId) {
        const opp = await tenantPrisma.opportunity.findUnique({ where: { id: opportunityId } });
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
    static async determineNextBestAction(tenantPrisma, opportunityId) {
        const opp = await tenantPrisma.opportunity.findUnique({ where: { id: opportunityId } });
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
    static async calculateCustomerRiskIndex(tenantPrisma, accountId) {
        let riskScore = 0;
        const lostDeals = await tenantPrisma.opportunity.count({
            where: { accountId, stage: 'ClosedLost' }
        });
        riskScore += lostDeals * 20;

        const staleContacts = await tenantPrisma.contact.count({
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
    static async calculateRevenueTrend(tenantPrisma) {
        const forecasts = await tenantPrisma.salesForecast.findMany({
            where: { type: 'monthly' },
            orderBy: { period: 'asc' }
        });
        if (!forecasts.length) return [];
        const revData = forecasts.map(f => f.expectedRevenue || 0);
        return salesMath.calculateEMA(revData, 3);
    }

    // [21] Market Basket Analysis
    static async performMarketBasketAnalysis(tenantPrisma) {
        // Concept/placeholder: assume Opportunity has a tags array representing products (stored in JSON or relation)
        const wonDeals = await tenantPrisma.opportunity.findMany({
            where: { stage: 'ClosedWon' }
        });
        const baskets = wonDeals
            .filter(d => d.tags && Array.isArray(d.tags) && d.tags.length > 0)
            .map(d => d.tags);
        return salesMath.getFrequentPairs(baskets, 0.1);
    }

    // [22] Cosine Similarity (Lookalikes)
    static async findLookalikeAccounts(tenantPrisma, sourceAccountId) {
        const targetAcc = await tenantPrisma.account.findUnique({ where: { id: sourceAccountId } });
        const allAccs = await tenantPrisma.account.findMany({
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
    static async detectActivityAnomalies(tenantPrisma, userId) {
        const lastWeek = await tenantPrisma.salesActivity.count({
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
    static async optimizeTerritories(tenantPrisma) {
        const accounts = await tenantPrisma.account.findMany({
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

    static async getDashboardMetrics(tenantDb, userId, companyId) {
        const Settings = tenantDb.settings;
        const Lead = tenantDb.lead;
        const Opportunity = tenantDb.opportunity;
        const Account = tenantDb.account;
        const SalesActivity = tenantDb.salesActivity;
        const SalesTask = tenantDb.salesTask;

        const settings = await Settings.findFirst();
        const currentMonth = new Date().toISOString().substring(0, 7);

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
            recentActivities
        ] = await Promise.all([
            this.calculateWeightedForecast(tenantDb, currentMonth).catch(() => null),
            this.calculateFunnelConversion(tenantDb).catch(() => null),
            this.calculateDashboardCharts(tenantDb).catch(() => null),
            this.calculateSalesCycleLength(tenantDb).catch(() => null),
            this.calculateRepProductivity(tenantDb, userId, settings).catch(() => null),
            this.detectChurnStagnation(tenantDb).catch(() => null),
            this.detectStagnantOpportunities(tenantDb, 14).catch(() => null),
            Lead.count().catch(() => 0),
            Opportunity.count({ where: { stage: { notIn: ['ClosedWon', 'ClosedLost'] } } }).catch(() => 0),
            Account.count().catch(() => 0),
            Opportunity.aggregate({ where: { stage: 'ClosedWon' }, _sum: { value: true } }).then(res => [{ total: res._sum?.value || 0 }]).catch(() => []),
            SalesActivity.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }).catch(() => [])
        ]);

        const wonRevenue = wonRevenueAggr.length ? wonRevenueAggr[0].total : 0;

        let recommendations = [];
        try {
            recommendations = await SalesTask.findMany({
                where: { assignedTo: userId, status: 'pending' },
                include: {
                    relatedLead: { select: { name: true, company: true } },
                    relatedDeal: { select: { title: true, value: true } }
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
                activeOpportunities: activeOpps || 0,
                totalAccounts: totalAccounts || 0,
                openPipelineValue: weightedForecast?.expectedRevenue || 0,
                weightedPipelineValue: weightedForecast?.weightedRevenue || 0,
                wonRevenue: wonRevenue || 0
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

    static async getForecasting(tenantDb, companyId) {
        const Opportunity = tenantDb.opportunity;
        const moment = require('moment');
        const { forecastPipeline } = require('../../company-hub-app/crm/CrmCalculationService.js');

        const startOfQ = moment().startOf('quarter').toDate();
        const endOfQ = moment().endOf('quarter').toDate();
        const quarterlyOpps = await Opportunity.findMany({ 
            where: { expectedCloseDate: { gte: startOfQ, lte: endOfQ }, stage: { notIn: ['ClosedWon', 'ClosedLost'] } },
            select: { value: true, probability: true }
        });
        const quarterly = forecastPipeline(quarterlyOpps);

        const startOfY = moment().startOf('year').toDate();
        const endOfY = moment().endOf('year').toDate();
        const yearlyOpps = await Opportunity.findMany({
            where: { expectedCloseDate: { gte: startOfY, lte: endOfY }, stage: { notIn: ['ClosedWon', 'ClosedLost'] } },
            select: { value: true, probability: true }
        });
        const yearly = forecastPipeline(yearlyOpps);

        const historicalWon = await Opportunity.aggregate({ where: { stage: 'ClosedWon' }, _count: { _all: true }, _sum: { value: true } }).then(res => [{ count: res._count._all, value: res._sum.value || 0 }]).catch(() => []);
        const historicalLost = await Opportunity.aggregate({ where: { stage: 'ClosedLost' }, _count: { _all: true }, _sum: { value: true } }).then(res => [{ count: res._count._all, value: res._sum.value || 0 }]).catch(() => []);

        const wonCount = historicalWon.length ? historicalWon[0].count : 0;
        const lostCount = historicalLost.length ? historicalLost[0].count : 0;
        const totalHistoricalDeals = wonCount + lostCount;
        const historicalWinRate = totalHistoricalDeals > 0 ? (wonCount / totalHistoricalDeals) * 100 : 0;

        const contextData = {
            quarterlyExpected: quarterly.expected,
            yearlyExpected: yearly.expected,
            historicalWinRate: `${historicalWinRate.toFixed(2)}%`,
            totalFinishedDeals: totalHistoricalDeals,
            totalWonValue: historicalWon.length ? historicalWon[0].value : 0,
            activeQuarterlyDeals: quarterlyOpps.length,
            activeYearlyDeals: yearlyOpps.length,
        };

        const settings = await tenantDb.settings.findFirst() || {};
        let aiForecast = null;
        if (settings.aiProvider && settings.aiProvider !== 'none') {
            const AIAutomationService = require('../ai-comms/ai-automation.service');
            aiForecast = await AIAutomationService.generateAdvancedForecast(contextData, settings);
        }

        return {
            quarterly,
            yearly,
            metrics: {
                historicalWinRate: historicalWinRate.toFixed(1),
                totalClosed: totalHistoricalDeals,
                wonValue: historicalWon.length ? historicalWon[0].value : 0
            },
            aiForecast
        };
    }

    static async getProductivity(tenantDb, userId) {
        const User = tenantDb.user;
        const allReps = await User.findMany({ where: { role: { in: ['admin', 'sales', 'manager'] } } });
        const { calculateRepProductivity } = require('../../company-hub-app/crm/CrmCalculationService.js');

        const leaderboard = [];
        for (const rep of allReps) {
            const [dealsClosed, revenue, activities] = await Promise.all([
                tenantDb.opportunity.count({ where: { owner: rep.id, stage: 'ClosedWon' } }),
                tenantDb.opportunity.aggregate({ where: { owner: rep.id, stage: 'ClosedWon' }, _sum: { value: true } }).then(res => [{ total: res._sum.value || 0 }]),
                tenantDb.salesActivity.count({ where: { owner: rep.id } })
            ]);

            const revValue = revenue.length ? revenue[0].total : 0;
            const score = calculateRepProductivity(dealsClosed, revValue, activities);

            leaderboard.push({ id: rep.id, name: rep.name, email: rep.email, score, dealsClosed });
        }
        leaderboard.sort((a, b) => b.score - a.score);

        const suggestedRepId = await this.suggestRepForLead(tenantDb);
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

    static async getRecommendations(tenantDb, userId) {
        const tasks = await tenantDb.salesTask.findMany({
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

    static async getLeads(tenantDb, page = 1, limit = 100) {
        const skip = (page - 1) * limit;
        const Lead = tenantDb.lead;
        
        const leads = await Lead.findMany({
            include: { assignedSalesRep: { select: { name: true, email: true } } },
            orderBy: { leadScore: 'desc' },
            skip: skip,
            take: limit
        });

        const total = await Lead.count();
        return { leads, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
    }

    static async createLead(tenantDb, leadData, userId) {
        const Lead = tenantDb.lead;
        const lead = await Lead.create({ data: leadData });

        await tenantDb.salesActivity.create({ data: {
            type: 'note',
            relatedLead: lead.id,
            notes: `New lead created: ${lead.name} from ${lead.company}`,
            owner: userId
        } });

        const settings = await tenantDb.settings.findFirst();
        const { scoreLead } = require('../../company-hub-app/crm/CrmCalculationService.js');
        const newScore = scoreLead(lead, settings?.salesConfig?.leadScoring);
        await Lead.update({ where: { id: lead.id }, data: { leadScore: newScore } });

        const SalesRuleEngine = require('./sales-rule-engine.service');
        await SalesRuleEngine.onLeadCreated(tenantDb, lead.id);

        try {
            const { triggerN8nWebhook } = require('../../../platform-core/platform-integrations/webhooks/webhook.routes');
            await triggerN8nWebhook('new-lead', {
                leadId: lead.id,
                name: lead.name,
                company: lead.company,
                assignedSalesRep: lead.assignedSalesRep
            });
        } catch (err) {}

        return lead;
    }

    static async importLeads(tenantDb, leads, userId) {
        if (!Array.isArray(leads) || leads.length === 0) {
            throw new Error('No leads provided');
        }

        const Lead = tenantDb.lead;
        const newLeads = leads.map(l => ({
            ...l,
            assignedSalesRep: l.assignedSalesRep || userId,
        }));

        const inserted = await Lead.createMany({ data: newLeads });
        const settings = await tenantDb.settings.findFirst();
        const { scoreLead } = require('../../company-hub-app/crm/CrmCalculationService.js');
        const SalesRuleEngine = require('./sales-rule-engine.service');

        // Note: Using findMany to get the inserted leads for scoring/triggers would be better, 
        // but skipping for now to match old behavior exactly.
        
        return inserted.length;
    }

    static async updateLead(tenantDb, id, updateData) {
        const Lead = tenantDb.lead;
        
        let lead = await Lead.findUnique({ where: { id } });
        if (!lead) throw new Error('Lead not found');

        lead = await Lead.update({
            where: { id },
            data: updateData
        });

        try {
            const settings = await tenantDb.settings.findFirst();
            await this.calculateLeadScore(tenantDb, lead, settings);
        } catch (scoringErr) {}

        try {
            const { triggerN8nWebhook } = require('../../../platform-core/platform-integrations/webhooks/webhook.routes');
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

    static async deleteLead(tenantDb, id) {
        await tenantDb.lead.update({ where: { id }, data: { deletedAt: new Date() } });
    }

    static async convertLead(tenantDb, id, userId) {
        const Lead = tenantDb.lead;
        const Account = tenantDb.account;
        const Contact = tenantDb.contact;
        const Opportunity = tenantDb.opportunity;

        const lead = await Lead.findUnique({ where: { id } });
        if (!lead) throw new Error('Lead not found');
        if (lead.status === 'converted') throw new Error('This lead has already been converted.');

        // Use interactive transaction
        return await tenantDb.$transaction(async (prisma) => {
            let account = await prisma.account.findFirst({ where: { companyName: { equals: lead.company.trim(), mode: 'insensitive' } } });
            
            if (!account) {
                account = await prisma.account.create({ data: {
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

        if (!process.env.OPENAPI_KEY && !process.env.OPENAI_API_KEY) {
            return {
                title: "Mocked Service Agreement",
                parties: ["Platform Corp", "Client LLC"],
                value: "$50,000",
                dates: { effectiveDate: "2024-01-01", expirationDate: "2025-01-01" },
                keyObligations: ["Provide software access", "Provide 99.9% uptime"],
                risks: ["Automatic renewal clause hidden in section 4", "High penalty for early termination", "Ambiguous liability limitation"]
            };
        }

        const { Configuration, OpenAIApi } = require("openai");
        const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY || process.env.OPENAPI_KEY });
        const openai = new OpenAIApi(configuration);

        const response = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.2
        });

        let resultText = response.data.choices[0].message.content;
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

        if (!process.env.OPENAPI_KEY && !process.env.OPENAI_API_KEY) {
            return {
                proposedChanges: "Mocked changes: Added standard limitation of liability and severability clauses to protect the company.",
                updatedContractText: "[MOCKED REVISED CONTRACT]\n\n" + text + "\n\n[ADDED] Limitation of Liability: In no event shall the company be liable for indirect damages."
            };
        }

        const { Configuration, OpenAIApi } = require("openai");
        const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY || process.env.OPENAPI_KEY });
        const openai = new OpenAIApi(configuration);

        const response = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3
        });

        let resultText = response.data.choices[0].message.content;
        if (resultText.startsWith('```json')) resultText = resultText.replace(/```json/g, '').replace(/```/g, '');

        return JSON.parse(resultText);
    }

    static async createContractWithAI(tenantDb, company, instructions, clientId) {
        if (!instructions) throw new Error('Instructions are required');

        let clientContext = '';
        let clientObj = null;
        if (clientId) {
            const Lead = tenantDb.lead;
            const Account = tenantDb.account;
            const Contact = tenantDb.contact;
            
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

        const { Configuration, OpenAIApi } = require("openai");
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

    static async getClientObjForContract(tenantDb, clientId) {
        if (!clientId) return null;
        const Lead = tenantDb.lead;
        const Account = tenantDb.account;
        const Contact = tenantDb.contact;
        return await Lead.findUnique({ where: { id: clientId } }) || await Account.findUnique({ where: { id: clientId } }) || await Contact.findUnique({ where: { id: clientId } });
    }

    static async emailContract(tenantDb, company, userId, userName, contractTitle, contractText, clientId, email) {
        if (!contractText || (!clientId && !email)) {
            throw new Error('Contract text and a recipient email or client selection is required.');
        }

        const Settings = tenantDb.settings;
        const settings = await Settings.findFirst();
        if (!settings || !settings.smtpHost) throw new Error('SMTP Settings are not configured.');

        let clientObj = null;
        let recipientEmail = email;

        if (clientId) {
            clientObj = await this.getClientObjForContract(tenantDb, clientId);
            if (clientObj && !recipientEmail) recipientEmail = clientObj.email;
        }

        if (!recipientEmail) throw new Error('No recipient email found.');

        const { generateContractPDF } = require('../../../platform-core/platform-engine/pdf/pdf.utils.js');
        const doc = new (require('pdfkit'))({ margin: 50 });
        
        let chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        generateContractPDF(doc, { contractTitle, contractText }, company, clientObj);
        doc.end();

        const pdfBuffer = await new Promise((resolve) => {
            doc.on('end', () => resolve(Buffer.concat(chunks)));
        });

        const emailService = require('../../productivity-tools-app/emails/email.service');
        const result = await emailService.sendGenericEmail(recipientEmail, 
            `${company?.companyName || '180workspace'} - ${contractTitle || 'Legal Agreement'}`,
            `Hello,\n\nPlease find the attached ${contractTitle || 'document'} prepared for you by ${company?.companyName || 'our team'}.\n\nBest regards,\n${userName}`,
            [
                {
                    filename: `${contractTitle ? contractTitle.replace(/\s+/g, '_') : 'Contract'}.pdf`,
                    content: pdfBuffer
                }
            ], 
            tenantDb
        );

        if (!result.success) throw new Error('Failed to send email');

        await tenantDb.salesActivity.create({ data: {
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

    static async getOpportunities(tenantDb, page = 1, limit = 100) {
        const skip = (page - 1) * limit;
        const Opportunity = tenantDb.opportunity;
        const opportunities = await Opportunity.findMany({ 
            include: { accountId: { select: { companyName: true } }, owner: { select: { name: true, email: true } } }, 
            orderBy: { priorityScore: 'desc' },
            skip: skip,
            take: limit
        });

        const total = await Opportunity.count();
        return { opportunities, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
    }

    static async createOpportunity(tenantDb, data, userId) {
        const Opportunity = tenantDb.opportunity;
        const opp = await Opportunity.create({ data: { ...data, owner: userId } });

        await tenantDb.salesActivity.create({ data: {
            type: 'task',
            relatedDeal: opp.id,
            relatedAccount: opp.accountId,
            notes: `New opportunity created: ${opp.title}`,
            owner: userId
        } });

        const settings = await tenantDb.settings.findFirst();
        const { calculateWinProbability } = require('../../company-hub-app/crm/CrmCalculationService.js');
        opp.probability = calculateWinProbability(opp.stage, opp.engagementScore, settings?.salesConfig?.opportunityStages);
        
        await Opportunity.update({ where: { id: opp.id }, data: { probability: opp.probability } });

        return opp;
    }

    static async updateOpportunity(tenantDb, id, data) {
        const Opportunity = tenantDb.opportunity;
        const oldOpp = await Opportunity.findUnique({ where: { id } });
        if (!oldOpp) throw new Error('Opportunity not found');

        const opp = await Opportunity.update({ where: { id }, data });

        const settings = await tenantDb.settings.findFirst();
        const { calculateWinProbability } = require('../../company-hub-app/crm/CrmCalculationService.js');
        opp.probability = calculateWinProbability(opp.stage, opp.engagementScore, settings?.salesConfig?.opportunityStages);
        
        await Opportunity.update({ where: { id: opp.id }, data: { probability: opp.probability } });

        let message = 'Opportunity updated successfully';
        if (data.stage === 'ClosedWon' && oldOpp.stage !== 'ClosedWon' && !opp.projectId) {
            message = 'Opportunity marked as Closed Won. You can now convert it to a project.';
        }

        return { opportunity: opp, message };
    }

    static async createProjectFromOpportunity(tenantDb, id, userId) {
        const Opportunity = tenantDb.opportunity;
        const Project = tenantDb.project;

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

    static async deleteOpportunity(tenantDb, id) {
        const Opportunity = tenantDb.opportunity;
        const opp = await Opportunity.delete({ where: { id } });
        if (!opp) throw new Error('Opportunity not found');
        return opp;
    }

    // ------------------------------------------------------------------------
    // ACCOUNTS & CONTACTS
    // ------------------------------------------------------------------------

    static async getAccounts(tenantDb, page = 1, limit = 100) {
        const skip = (page - 1) * limit;
        const Account = tenantDb.account;
        const accountsRaw = await Account.findMany({
            orderBy: { clv: 'desc' },
            skip: skip,
            take: limit
        });

        const Opportunity = tenantDb.opportunity;
        const Contact = tenantDb.contact;
        const moment = require('moment');
        const { calculateCustomerRiskIndex } = require('../../company-hub-app/crm/CrmCalculationService.js');

        const accounts = await Promise.all(accountsRaw.map(async acc => {
            const [lostDeals, staleContacts] = await Promise.all([
                Opportunity.count({ where: { accountId: acc.id, stage: 'ClosedLost' } }),
                Contact.count({ where: {
                    accountId: acc.id,
                    lastContacted: { lt: moment().subtract(60, 'days').toDate() }
                } })
            ]);

            const riskIndex = calculateCustomerRiskIndex(lostDeals, staleContacts);
            let healthStatus = 'Healthy';
            if (riskIndex > 60) healthStatus = 'At Risk';
            if (riskIndex > 90) healthStatus = 'Churned';

            return { ...acc, riskIndex, healthStatus };
        }));

        const total = await Account.count();
        return { accounts, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
    }

    static async createAccount(tenantDb, data, userId) {
        const Account = tenantDb.account;
        const account = await Account.create({ data: {
            ...data,
            assignedManager: userId
        } });
        return account;
    }

    static async updateAccount(tenantDb, id, data) {
        const Account = tenantDb.account;
        const account = await Account.update({ where: { id }, data });
        if (!account) throw new Error('Account not found');
        return account;
    }

    static async deleteAccount(tenantDb, id) {
        const Account = tenantDb.account;
        const account = await Account.delete({ where: { id } });
        if (!account) throw new Error('Account not found');
        return account;
    }

    static async getContacts(tenantDb, page = 1, limit = 100) {
        const skip = (page - 1) * limit;
        const Contact = tenantDb.contact;
        const contacts = await Contact.findMany({
            include: { accountId: { select: { companyName: true } } },
            skip: skip,
            take: limit
        });

        const total = await Contact.count();
        return { contacts, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
    }

    static async getContact(tenantDb, id) {
        const Contact = tenantDb.contact;
        const contact = await Contact.findUnique({ 
            where: { id },
            include: { accountId: { select: { companyName: true, clv: true, industry: true } } }
        });

        if (!contact) throw new Error('Contact not found');

        const Opportunity = tenantDb.opportunity;
        const opportunities = await Opportunity.findMany({
            where: { accountId: contact.accountId },
            select: { title: true, value: true, stage: true, probability: true, expectedCloseDate: true }
        });

        const SalesActivity = tenantDb.salesActivity;
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

    static async createContact(tenantDb, data) {
        const Contact = tenantDb.contact;

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

    static async updateContact(tenantDb, id, data) {
        const Contact = tenantDb.contact;
        const contact = await Contact.update({ where: { id }, data });
        if (!contact) throw new Error('Contact not found');
        return contact;
    }

    static async deleteContact(tenantDb, id) {
        const Contact = tenantDb.contact;
        const contact = await Contact.delete({ where: { id } });
        if (!contact) throw new Error('Contact not found');
        return contact;
    }

    // ------------------------------------------------------------------------
    // ACTIVITIES
    // ------------------------------------------------------------------------

    static async getActivities(tenantDb, page = 1, limit = 100) {
        const skip = (page - 1) * limit;
        const SalesActivity = tenantDb.salesActivity;
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

    static async createActivity(tenantDb, data, userId) {
        const SalesActivity = tenantDb.salesActivity;
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

    static async getQuotes(tenantDb, page = 1, limit = 100) {
        const skip = (page - 1) * limit;
        const Quote = tenantDb.quote;

        const quotes = await Quote.findMany({
            include: { 
                clientId: { select: { name: true, company: true } },
                opportunityId: { select: { title: true } },
                createdBy: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' },
            skip: skip,
            take: limit
        });

        const total = await Quote.count();
        return { quotes, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
    }

    static async createQuote(tenantDb, data, userId, companyId) {
        const Quote = tenantDb.quote;
        const quoteNumber = `QT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

        const quote = await Quote.create({ data: {
            ...data,
            quoteNumber,
            companyId,
            createdBy: userId
        } });

        return quote;
    }

    static async updateQuote(tenantDb, id, data) {
        const Quote = tenantDb.quote;
        const quote = await Quote.update({ where: { id }, data });
        if (!quote) throw new Error('Quote not found');
        return quote;
    }

    static async deleteQuote(tenantDb, id) {
        const Quote = tenantDb.quote;
        const quote = await Quote.delete({ where: { id } });
        if (!quote) throw new Error('Quote not found');
        return quote;
    }

    static async getQuoteForPdf(tenantDb, id) {
        const Quote = tenantDb.quote;
        const quote = await Quote.findUnique({ where: { id }, include: { clientId: true } });
        if (!quote) throw new Error('Quote not found');
        return quote;
    }

    static async sendQuoteEmail(tenantDb, id, user, emailOverride, reqCompany) {
        const Settings = tenantDb.settings;
        const Quote = tenantDb.quote;
        const PDFDocument = require('pdfkit');
        const { generateQuotationPDF } = require('../../../platform-core/platform-engine/pdf/pdf.utils.js');

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

        const quote = await Quote.findUnique({ where: { id }, include: { clientId: true } });
        if (!quote) throw new Error('Quote not found');

        const recipientEmail = emailOverride || quote.clientId?.email;
        if (!recipientEmail) {
            const err = new Error('Recipient email is missing. Please provide an email address.');
            err.status = 400;
            throw err;
        }

        const doc = new PDFDocument();
        let chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        
        generateQuotationPDF(doc, quote, reqCompany);
        doc.end();

        const pdfBuffer = await new Promise((resolve) => {
            doc.on('end', () => resolve(Buffer.concat(chunks)));
        });

        const emailService = require('../../productivity-tools-app/emails/email.service');
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
        ], tenantDb);

        if (!result.success) {
            const err = new Error('Failed to send email: ' + result.error);
            err.status = 500;
            throw err;
        }

        await tenantDb.salesActivity.create({ data: {
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

    static async getRevenueStats(tenantDb) {
        const Opportunity = tenantDb.opportunity;
        const moment = require('moment');

        const closedWonAgg = await Opportunity.aggregate({ where: { stage: 'ClosedWon' }, _sum: { value: true } });
        const closedWonValue = closedWonAgg._sum.value || 0;

        const sixMonthsAgo = moment().subtract(6, 'months').startOf('month').toDate();
        const rawOpps = await Opportunity.findMany({
            where: { stage: 'ClosedWon', expectedCloseDate: { gte: sixMonthsAgo } },
            select: { expectedCloseDate: true, value: true }
        });
        
        const trendMap = {};
        rawOpps.forEach(opp => {
            if(!opp.expectedCloseDate) return;
            const m = moment(opp.expectedCloseDate).format('YYYY-MM');
            if(!trendMap[m]) trendMap[m] = { _id: m, revenue: 0, deals: 0 };
            trendMap[m].revenue += (opp.value || 0);
            trendMap[m].deals += 1;
        });
        const monthlyTrendData = Object.values(trendMap).sort((a,b) => a._id.localeCompare(b._id));

        const pipelineAgg = await Opportunity.aggregate({ where: { stage: { notIn: ['ClosedWon', 'ClosedLost'] } }, _sum: { value: true } });
        const pipelineValue = pipelineAgg._sum.value || 0;

        const pbsRaw = await Opportunity.groupBy({
            by: ['stage'],
            where: { stage: { notIn: ['ClosedWon', 'ClosedLost'] } },
            _count: { _all: true },
            _sum: { value: true }
        });
        const pipelineByStage = pbsRaw.map(p => ({ _id: p.stage, count: p._count._all, totalValue: p._sum.value || 0 })).sort((a,b) => b.totalValue - a.totalValue);

        const winLoss = await Opportunity.aggregate({
            where: { stage: { in: ['ClosedWon', 'ClosedLost'] } },
            _group: { by: ['stage'], _count: { _all: true } }
        });

        let wonCount = 0; let lostCount = 0;
        winLoss.forEach(st => {
            if (st._id === 'ClosedWon') wonCount = st.count;
            if (st._id === 'ClosedLost') lostCount = st.count;
        });

        const topDeals = await Opportunity.findMany({ 
            where: { stage: 'ClosedWon' }, 
            orderBy: { value: 'desc' }, 
            take: 5, 
            select: { title: true, value: true, expectedCloseDate: true } 
        });

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
            topDeals
        };
    }
}

module.exports = SalesService;
