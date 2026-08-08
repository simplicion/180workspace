'use strict';

const moment = require('moment');
const salesMath = require('../utils/salesMath.js');

class SalesService {
    // ------------------------------------------------------------------------
    // [1-3] Scoring & Forecasting
    // ------------------------------------------------------------------------

    // [1] Lead Scoring: (CompanySize Ã— W1) + (IndustryMatch Ã— W2) + ...
    static async calculateLeadScore(companyPrisma, leadIdOrDoc, settings) {
        let lead;

        if (typeof leadIdOrDoc === 'string') {
            lead = await companyPrisma.deal.findUnique({ where: { id: leadIdOrDoc } });
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
            await companyPrisma.deal.update({
                where: { id: leadIdOrDoc },
                data: { leadScore: calculatedScore }
            });
        } else {
            lead.leadScore = calculatedScore;
        }
        
        return calculatedScore;
    }

    // [2] Win Probability: StageWeight Ã— EngagementScore
    static async calculateWinProbability(companyPrisma, opportunityId, settings) {
        const opp = await companyPrisma.lead.findUnique({ where: { id: opportunityId } });
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

        await companyPrisma.lead.update({
            where: { id: opportunityId },
            data: { probability: calcProb }
        });
        return calcProb;
    }

    // [3] Weighted Forecast: Î£ (DealValue Ã— WinProbability)
    static async calculateWeightedForecast(companyPrisma, periodStr) {
        const opps = await companyPrisma.lead.findMany({
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

        await companyPrisma.salesForecast.upsert({
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
    static async calculateCLV(companyPrisma, accountId) {
        const wonDeals = await companyPrisma.lead.findMany({
            where: { accountId, stage: 'ClosedWon' }
        });

        if (!wonDeals.length) return 0;
        const avgDealValue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0) / wonDeals.length;
        const dealsPerYear = wonDeals.length;
        const retentionYears = 3;

        const clv = Math.round(avgDealValue * dealsPerYear * retentionYears);
        await companyPrisma.account.update({
            where: { id: accountId },
            data: { clv }
        });
        return clv;
    }

    // [5] RFM Analysis (Recency, Frequency, Monetary)
    static async segmentAccountsRFM(companyPrisma) {
        const accounts = await companyPrisma.account.findMany();

        const segments = [];
        for (let acc of accounts) {
            const deals = await companyPrisma.lead.findMany({
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
    static async calculateFunnelConversion(companyPrisma) {
        const totalLeads = await companyPrisma.deal.count() || 1;
        const qualifiedLeads = await companyPrisma.deal.count({
            where: { status: { in: ['qualified', 'converted'] } }
        });

        const totalProposals = await companyPrisma.lead.count({
            where: { stage: { in: ['Proposal', 'Negotiation', 'ClosedWon', 'ClosedLost'] } }
        }) || 1;
        const wonDeals = await companyPrisma.lead.count({
            where: { stage: 'ClosedWon' }
        });

        return {
            leadConversionRate: (qualifiedLeads / totalLeads) * 100,
            proposalConversionRate: (wonDeals / totalProposals) * 100,
            dealWinRate: (wonDeals / totalProposals) * 100
        };
    }

    // [6b] Dashboard Realtime Charts
    static async calculateDashboardCharts(companyPrisma) {
        try {
            // Pipeline by stage
            const opps = await companyPrisma.lead.findMany({
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
            const wonOpps = await companyPrisma.lead.findMany({
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

                const wonMonth = await companyPrisma.lead.findMany({
                    where: {
                        stage: 'ClosedWon',
                        expectedCloseDate: { gte: startDate, lte: endDate }
                    },
                    select: { value: true }
                });
                const wonTotal = wonMonth.reduce((sum, o) => sum + (o.value || 0), 0);

                const pipeMonth = await companyPrisma.lead.findMany({
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
    static async calculateSalesCycleLength(companyPrisma) {
        const wonDeals = await companyPrisma.lead.findMany({
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
    static async findDuplicateLeads(companyPrisma, leadName, email) {
        const leads = await companyPrisma.deal.findMany({
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
    static async rankOpportunities(companyPrisma) {
        const opps = await companyPrisma.lead.findMany({
            where: { stage: { notIn: ['ClosedWon', 'ClosedLost'] } }
        });

        for (const opp of opps) {
            const priorityScore = ((opp.value || 0) * (opp.probability || 0) * (opp.engagementScore || 1)) / 10000;
            await companyPrisma.lead.update({
                where: { id: opp.id },
                data: { priorityScore }
            });
        }

        const updatedOpps = await companyPrisma.lead.findMany({
            where: { stage: { notIn: ['ClosedWon', 'ClosedLost'] } },
            orderBy: { priorityScore: 'desc' }
        });
        return updatedOpps;
    }

    // [10] Churn Risk / Stagnation detection for Accounts
    static async detectChurnStagnation(companyPrisma) {
        const accountsAtRisk = [];
        const contacts = await companyPrisma.contact.findMany();

        for (let c of contacts) {
            if (c.lastContacted) {
                const daysSince = moment().diff(moment(c.lastContacted), 'days');
                if (daysSince > 60) accountsAtRisk.push(c.accountId);
            }
        }
        return [...new Set(accountsAtRisk)];
    }

    // [11] Stagnation Detection for Deals
    static async detectStagnantOpportunities(companyPrisma, thresholdDays = 14) {
        const opps = await companyPrisma.lead.findMany({
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
    static async calculateRepProductivity(companyPrisma, userId, settings) {
        const config = settings?.salesConfig?.repProductivity || {
            dealsClosedWeight: 0.5, revenueGeneratedWeight: 0.3, activitiesCompletedWeight: 0.2
        };

        const dealsClosed = await companyPrisma.lead.count({
            where: { ownerId: userId, stage: 'ClosedWon' }
        });

        const revenue = await companyPrisma.lead.findMany({
            where: { ownerId: userId, stage: 'ClosedWon' },
            select: { value: true }
        });
        const revValue = revenue.reduce((sum, o) => sum + (o.value || 0), 0);

        const activities = await companyPrisma.salesActivity.count({
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
    static async suggestRepForLead(companyPrisma) {
        const leads = await companyPrisma.deal.findMany({
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
    static async clusterAccountsByValue(companyPrisma) {
        const accounts = await companyPrisma.account.findMany({
            where: { clv: { gt: 0 } }
        });
        if (accounts.length < 3) return [];

        const clvs = accounts.map(a => a.clv);
        const clusters = salesMath.simple1DKMeans(clvs, 3);

        return accounts.map((a, idx) => ({ accountId: a.id, clusterId: clusters[idx] }));
    }

    // [15] Logistic Regression Approximation for Win Likelihood
    static async calculateWinLikelihoodLogistic(companyPrisma, opportunityId) {
        const opp = await companyPrisma.lead.findUnique({ where: { id: opportunityId } });
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
    static async determineNextBestAction(companyPrisma, opportunityId) {
        const opp = await companyPrisma.lead.findUnique({ where: { id: opportunityId } });
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
    static async calculateCustomerRiskIndex(companyPrisma, accountId) {
        let riskScore = 0;
        const lostDeals = await companyPrisma.lead.count({
            where: { accountId, stage: 'ClosedLost' }
        });
        riskScore += lostDeals * 20;

        const staleContacts = await companyPrisma.contact.count({
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
    static async calculateRevenueTrend(companyPrisma) {
        const forecasts = await companyPrisma.salesForecast.findMany({
            where: { type: 'monthly' },
            orderBy: { period: 'asc' }
        });
        if (!forecasts.length) return [];
        const revData = forecasts.map(f => f.expectedRevenue || 0);
        return salesMath.calculateEMA(revData, 3);
    }

    // [21] Market Basket Analysis
    static async performMarketBasketAnalysis(companyPrisma) {
        // Concept/placeholder: assume Opportunity has a tags array representing products (stored in JSON or relation)
        const wonDeals = await companyPrisma.lead.findMany({
            where: { stage: 'ClosedWon' }
        });
        const baskets = wonDeals
            .filter(d => d.tags && Array.isArray(d.tags) && d.tags.length > 0)
            .map(d => d.tags);
        return salesMath.getFrequentPairs(baskets, 0.1);
    }

    // [22] Cosine Similarity (Lookalikes)
    static async findLookalikeAccounts(companyPrisma, sourceAccountId) {
        const targetAcc = await companyPrisma.account.findUnique({ where: { id: sourceAccountId } });
        const allAccs = await companyPrisma.account.findMany({
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
    static async detectActivityAnomalies(companyPrisma, userId) {
        const lastWeek = await companyPrisma.salesActivity.count({
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
    static async optimizeTerritories(companyPrisma) {
        const accounts = await companyPrisma.account.findMany({
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

    static async getDashboardMetrics(companyPrisma, userId, companyId) {
        const Settings = companyPrisma.settings;
        const Lead = companyPrisma.deal;
        const Opportunity = companyPrisma.lead;
        const Account = companyPrisma.salesAccount;
        const SalesActivity = companyPrisma.salesActivity;
        const SalesTask = companyPrisma.salesTask;

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
            this.calculateWeightedForecast(companyPrisma, currentMonth).catch(() => null),
            this.calculateFunnelConversion(companyPrisma).catch(() => null),
            this.calculateDashboardCharts(companyPrisma).catch(() => null),
            this.calculateSalesCycleLength(companyPrisma).catch(() => null),
            this.calculateRepProductivity(companyPrisma, userId, settings).catch(() => null),
            this.detectChurnStagnation(companyPrisma).catch(() => null),
            this.detectStagnantOpportunities(companyPrisma, 14).catch(() => null),
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

    static async getForecasting(companyPrisma, companyId) {
        const Opportunity = companyPrisma.lead;
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

        const settings = await companyPrisma.settings.findFirst() || {};
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

    static async getProductivity(companyPrisma, userId) {
        const User = companyPrisma.user;
        const allReps = await User.findMany({ where: { role: { in: ['admin', 'sales', 'manager'] } } });
        const { calculateRepProductivity } = require('../../company-hub-app/crm/CrmCalculationService.js');

        const leaderboard = [];
        for (const rep of allReps) {
            const [dealsClosed, revenue, activities] = await Promise.all([
                companyPrisma.lead.count({ where: { owner: rep.id, stage: 'ClosedWon' } }),
                companyPrisma.lead.aggregate({ where: { owner: rep.id, stage: 'ClosedWon' }, _sum: { value: true } }).then(res => [{ total: res._sum.value || 0 }]),
                companyPrisma.salesActivity.count({ where: { owner: rep.id } })
            ]);

            const revValue = revenue.length ? revenue[0].total : 0;
            const score = calculateRepProductivity(dealsClosed, revValue, activities);

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

    static async getRecommendations(companyPrisma, userId) {
        const tasks = await companyPrisma.salesTask.findMany({
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

    static async getLeads(companyPrisma, page = 1, limit = 100) {
        const skip = (page - 1) * limit;
        const Lead = companyPrisma.deal;
        
        const leads = await Lead.findMany({
            include: { assignedSalesRep: { select: { name: true, email: true } } },
            orderBy: { leadScore: 'desc' },
            skip: skip,
            take: limit
        });

        const total = await Lead.count();
        return { leads, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
    }

    static async createLead(companyPrisma, leadData, userId) {
        const Lead = companyPrisma.deal;
        const lead = await Lead.create({ data: leadData });

        await companyPrisma.salesActivity.create({ data: {
            type: 'note',
            relatedLead: lead.id,
            notes: `New lead created: ${lead.name} from ${lead.company}`,
            owner: userId
        } });

        const settings = await companyPrisma.settings.findFirst();
        const { scoreLead } = require('../../company-hub-app/crm/CrmCalculationService.js');
        const newScore = scoreLead(lead, settings?.salesConfig?.leadScoring);
        await Lead.update({ where: { id: lead.id }, data: { leadScore: newScore } });

        const SalesRuleEngine = require('./sales-rule-engine.service');
        await SalesRuleEngine.onLeadCreated(companyPrisma, lead.id);

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

    static async importLeads(companyPrisma, leads, userId) {
        if (!Array.isArray(leads) || leads.length === 0) {
            throw new Error('No leads provided');
        }

        const Lead = companyPrisma.deal;
        const newLeads = leads.map(l => ({
            ...l,
            assignedSalesRep: l.assignedSalesRep || userId,
        }));

        const inserted = await Lead.createMany({ data: newLeads });
        const settings = await companyPrisma.settings.findFirst();
        const { scoreLead } = require('../../company-hub-app/crm/CrmCalculationService.js');
        const SalesRuleEngine = require('./sales-rule-engine.service');

        // Note: Using findMany to get the inserted leads for scoring/triggers would be better, 
        // but skipping for now to match old behavior exactly.
        
        return inserted.length;
    }

    static async updateLead(companyPrisma, id, updateData) {
        const Lead = companyPrisma.deal;
        
        let lead = await Lead.findUnique({ where: { id } });
        if (!lead) throw new Error('Lead not found');

        lead = await Lead.update({
            where: { id },
            data: updateData
        });

        try {
            const settings = await companyPrisma.settings.findFirst();
            await this.calculateLeadScore(companyPrisma, lead, settings);
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

    static async deleteLead(companyPrisma, id) {
        await companyPrisma.deal.update({ where: { id }, data: { deletedAt: new Date() } });
    }

    static async convertLead(companyPrisma, id, userId) {
        const Lead = companyPrisma.deal;
        const Account = companyPrisma.salesAccount;
        const Contact = companyPrisma.contact;
        const Opportunity = companyPrisma.lead;

        const lead = await Lead.findUnique({ where: { id } });
        if (!lead) throw new Error('Lead not found');
        if (lead.status === 'converted') throw new Error('This lead has already been converted.');

        // Use interactive transaction
        return await companyPrisma.$transaction(async (prisma) => {
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

    static async createContractWithAI(companyPrisma, company, instructions, clientId) {
        if (!instructions) throw new Error('Instructions are required');

        let clientContext = '';
        let clientObj = null;
        if (clientId) {
            const Lead = companyPrisma.deal;
            const Account = companyPrisma.salesAccount;
            const Contact = companyPrisma.contact;
            
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

    static async getClientObjForContract(companyPrisma, clientId) {
        if (!clientId) return null;
        const Lead = companyPrisma.deal;
        const Account = companyPrisma.salesAccount;
        const Contact = companyPrisma.contact;
        return await Lead.findUnique({ where: { id: clientId } }) || await Account.findUnique({ where: { id: clientId } }) || await Contact.findUnique({ where: { id: clientId } });
    }

    static async emailContract(companyPrisma, company, userId, userName, contractTitle, contractText, clientId, email) {
        if (!contractText || (!clientId && !email)) {
            throw new Error('Contract text and a recipient email or client selection is required.');
        }

        const Settings = companyPrisma.settings;
        const settings = await Settings.findFirst();
        if (!settings || !settings.smtpHost) throw new Error('SMTP Settings are not configured.');

        let clientObj = null;
        let recipientEmail = email;

        if (clientId) {
            clientObj = await this.getClientObjForContract(companyPrisma, clientId);
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
            companyPrisma
        );

        if (!result.success) throw new Error('Failed to send email');

        await companyPrisma.salesActivity.create({ data: {
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

    static async getOpportunities(companyPrisma, page = 1, limit = 100, pipelineType) {
        const skip = (page - 1) * limit;
        const Opportunity = companyPrisma.lead;
        
        const whereClause = {};
        if (pipelineType) {
            whereClause.pipelineType = pipelineType;
        }

        const opportunities = await Opportunity.findMany({ 
            where: whereClause,
            include: { owner: { select: { name: true, email: true } } }, 
            orderBy: { priorityScore: 'desc' },
            skip: skip,
            take: limit
        });

        const total = await Opportunity.count({ where: whereClause });
        return { opportunities, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
    }

    static async createOpportunity(companyPrisma, data, userId) {
        const Opportunity = companyPrisma.lead;
        
        const followUpDate = data.followUpDate;
        const followUpTime = data.followUpTime;
        const notes = data.notes;
        
        delete data.followUpDate;
        delete data.followUpTime;
        delete data.notes;

        if (data.owner) {
            data.ownerId = data.owner;
            delete data.owner;
        } else {
            data.ownerId = userId;
        }
        
        const opp = await Opportunity.create({ data: { ...data } });

        if (notes) {
            await companyPrisma.salesActivity.create({ data: {
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
            await companyPrisma.salesTask.create({
                data: {
                    description: `Follow up on deal: ${opp.title}`,
                    dueDate: new Date(combinedDate),
                    assignedTo: opp.ownerId || userId,
                    leadId: opp.id,
                }
            });
        }


        await companyPrisma.salesActivity.create({ data: {
            type: 'task',
            leadId: opp.id,
            relatedClientId: opp.clientId,
            notes: `New opportunity created: ${opp.title}`,
            ownerId: userId
        } });

        const settings = await companyPrisma.settings.findFirst();
        const { calculateWinProbability } = require('../../company-hub-app/crm/CrmCalculationService.js');
        opp.probability = calculateWinProbability(opp.stage, opp.engagementScore, settings?.salesConfig?.opportunityStages);
        
        await Opportunity.update({ where: { id: opp.id }, data: { probability: opp.probability } });

        return opp;
    }

    static async updateOpportunity(companyPrisma, id, data) {
        const Opportunity = companyPrisma.lead;
        const Deal = companyPrisma.deal;
        const oldOpp = await Opportunity.findUnique({ where: { id } });
        if (!oldOpp) throw new Error('Opportunity not found');

        if (data.convertToDeal) {
            data.pipelineType = 'ACTIVE_CLIENT';
            
            await Deal.create({
                data: {
                    name: oldOpp.contactName || oldOpp.title,
                    email: oldOpp.contactEmail || '',
                    phone: oldOpp.contactPhone || '',
                    company: oldOpp.companyName || '',
                    industry: oldOpp.industry || '',
                    source: oldOpp.source || 'outbound',
                    status: 'kickoff',
                    value: oldOpp.value || 0,
                    assignedSalesRepId: oldOpp.ownerId,
                    notes: `Automatically created from won lead: ${oldOpp.title}`
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


        const opp = await Opportunity.update({ where: { id }, data });

        if (notes) {
            await companyPrisma.salesActivity.create({ data: {
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
            await companyPrisma.salesTask.create({
                data: {
                    description: `Follow up on deal: ${opp.title}`,
                    dueDate: new Date(combinedDate),
                    assignedTo: opp.ownerId,
                    leadId: opp.id,
                }
            });
        }

        const settings = await companyPrisma.settings.findFirst();
        const { calculateWinProbability } = require('../../company-hub-app/crm/CrmCalculationService.js');
        opp.probability = calculateWinProbability(opp.stage, opp.engagementScore, settings?.salesConfig?.opportunityStages);
        
        await Opportunity.update({ where: { id: opp.id }, data: { probability: opp.probability } });

        let message = 'Opportunity updated successfully';
        if (data.stage === 'ClosedWon' && oldOpp.stage !== 'ClosedWon' && !opp.projectId) {
            message = 'Opportunity marked as Closed Won and converted to Deal. You can now convert it to a project.';
        }

        return { opportunity: opp, message };
    }

    static async createProjectFromOpportunity(companyPrisma, id, userId) {
        const Opportunity = companyPrisma.lead;
        const Project = companyPrisma.project;

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

    static async deleteOpportunity(companyPrisma, id) {
        const Opportunity = companyPrisma.lead;
        const opp = await Opportunity.delete({ where: { id } });
        if (!opp) throw new Error('Opportunity not found');
        return opp;
    }

    // ------------------------------------------------------------------------
    // ACCOUNTS & CONTACTS
    // ------------------------------------------------------------------------

    static async getAccounts(companyPrisma, page = 1, limit = 100) {
        const skip = (page - 1) * limit;
        const Account = companyPrisma.salesAccount;
        const accountsRaw = await Account.findMany({
            orderBy: { clv: 'desc' },
            skip: skip,
            take: limit
        });

        const Opportunity = companyPrisma.lead;
        const Contact = companyPrisma.contact;
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

    static async createAccount(companyPrisma, data, userId) {
        const Account = companyPrisma.salesAccount;
        const account = await Account.create({ data: {
            ...data,
            assignedManager: userId
        } });
        return account;
    }

    static async updateAccount(companyPrisma, id, data) {
        const Account = companyPrisma.salesAccount;
        const account = await Account.update({ where: { id }, data });
        if (!account) throw new Error('Account not found');
        return account;
    }

    static async deleteAccount(companyPrisma, id) {
        const Account = companyPrisma.salesAccount;
        const account = await Account.delete({ where: { id } });
        if (!account) throw new Error('Account not found');
        return account;
    }

    static async getContacts(companyPrisma, page = 1, limit = 100) {
        const skip = (page - 1) * limit;
        const Contact = companyPrisma.contact;
        const contacts = await Contact.findMany({
            include: { accountId: { select: { companyName: true } } },
            skip: skip,
            take: limit
        });

        const total = await Contact.count();
        return { contacts, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
    }

    static async getContact(companyPrisma, id) {
        const Contact = companyPrisma.contact;
        const contact = await Contact.findUnique({ 
            where: { id },
            include: { accountId: { select: { companyName: true, clv: true, industry: true } } }
        });

        if (!contact) throw new Error('Contact not found');

        const Opportunity = companyPrisma.lead;
        const opportunities = await Opportunity.findMany({
            where: { accountId: contact.accountId },
            select: { title: true, value: true, stage: true, probability: true, expectedCloseDate: true }
        });

        const SalesActivity = companyPrisma.salesActivity;
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

    static async createContact(companyPrisma, data) {
        const Contact = companyPrisma.contact;

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

    static async updateContact(companyPrisma, id, data) {
        const Contact = companyPrisma.contact;
        const contact = await Contact.update({ where: { id }, data });
        if (!contact) throw new Error('Contact not found');
        return contact;
    }

    static async deleteContact(companyPrisma, id) {
        const Contact = companyPrisma.contact;
        const contact = await Contact.delete({ where: { id } });
        if (!contact) throw new Error('Contact not found');
        return contact;
    }

    // ------------------------------------------------------------------------
    // ACTIVITIES
    // ------------------------------------------------------------------------

    static async getActivities(companyPrisma, page = 1, limit = 100) {
        const skip = (page - 1) * limit;
        const SalesActivity = companyPrisma.salesActivity;
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

    static async createActivity(companyPrisma, data, userId) {
        const SalesActivity = companyPrisma.salesActivity;
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

    static async getQuotes(companyPrisma, page = 1, limit = 100) {
        const skip = (page - 1) * limit;
        const Quote = companyPrisma.quote;

        const quotes = await Quote.findMany({
            include: { 
                createdBy: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' },
            skip: skip,
            take: limit
        });

        // Manually populate client and opportunity data
        const Client = companyPrisma.client;
        const Opportunity = companyPrisma.lead;
        
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

    static async createQuote(companyPrisma, data, userId, companyId) {
        const Quote = companyPrisma.quote;
        const quoteNumber = `QT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

        const quote = await Quote.create({ data: {
            ...data,
            quoteNumber,
            companyId,
            createdBy: userId
        } });

        return quote;
    }

    static async updateQuote(companyPrisma, id, data) {
        const Quote = companyPrisma.quote;
        const quote = await Quote.update({ where: { id }, data });
        if (!quote) throw new Error('Quote not found');
        return quote;
    }

    static async deleteQuote(companyPrisma, id) {
        const Quote = companyPrisma.quote;
        const quote = await Quote.delete({ where: { id } });
        if (!quote) throw new Error('Quote not found');
        return quote;
    }

    static async getQuoteForPdf(companyPrisma, id) {
        const Quote = companyPrisma.quote;
        const Client = companyPrisma.client;
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

    static async sendQuoteEmail(companyPrisma, id, user, emailOverride, reqCompany) {
        const Settings = companyPrisma.settings;
        const Quote = companyPrisma.quote;
        const Client = companyPrisma.client;
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
        ], companyPrisma);

        if (!result.success) {
            const err = new Error('Failed to send email: ' + result.error);
            err.status = 500;
            throw err;
        }

        await companyPrisma.salesActivity.create({ data: {
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

    static async getRevenueStats(companyPrisma, timeframe = 'all') {
        const Opportunity = companyPrisma.lead;
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
            dateFilter = { gte: moment().subtract(1, 'month').startOf('month').toDate() };
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
            topDeals
        };
    }
}

module.exports = SalesService;
