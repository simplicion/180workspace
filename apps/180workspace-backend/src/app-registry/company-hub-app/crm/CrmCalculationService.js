'use strict';

/**
 * Calculates Recency, Frequency, and Monetary scores for accounts.
 * @param {Array} deals - Array of won deals with expectedCloseDate and value.
 * @returns {Object} - RFM metrics and segment.
 */
function calculateRFM(deals) {
    if (!deals || deals.length === 0) return { r: 0, f: 0, m: 0, segment: 'None' };
    const moment = require('moment');

    // Sort deals by date to get most recent
    const sortedDeals = [...deals].sort((a, b) => new Date(b.expectedCloseDate) - new Date(a.expectedCloseDate));

    const recency = moment().diff(moment(sortedDeals[0].expectedCloseDate), 'days');
    const frequency = sortedDeals.length;
    const monetary = sortedDeals.reduce((sum, d) => sum + d.value, 0);

    let segment = 'At Risk';
    if (recency <= 90 && frequency >= 3) segment = 'Loyal';
    else if (recency <= 180 && frequency >= 1) segment = 'Active';

    return { r: recency, f: frequency, m: monetary, segment };
}

/**
 * Calculates expected and weighted revenue for a pipeline.
 * @param {Array} opportunities - Array of opportunities with value and probability.
 * @returns {Object} - Expected and weighted sums.
 */
function forecastPipeline(opportunities) {
    let expected = 0;
    let weighted = 0;
    opportunities.forEach(opp => {
        const value = opp.value || 0;
        const prob = opp.probability || 0;
        expected += value;
        weighted += (value * (prob / 100));
    });
    return { expected, weighted: Math.round(weighted) };
}

/**
 * Calculates a lead's priority score based on size, industry, source, and engagement.
 * @param {Object} lead - The lead object.
 * @param {Object} config - Weight configuration.
 * @returns {number} - Calculated lead score.
 */
function scoreLead(lead, config) {
    const weights = config || {
        companySizeWeight: 0.3,
        industryWeight: 0.25,
        engagementWeight: 0.25,
        sourceWeight: 0.2
    };

    let sizeScore = lead.companySize > 500 ? 100 : lead.companySize > 50 ? 50 : 10;
    let indScore = ['Technology', 'SaaS', 'Finance'].includes(lead.industry) ? 100 : 50;
    let srcScore = lead.source === 'Inbound' ? 100 : lead.source === 'Referral' ? 80 : 30;

    return Math.round(
        (sizeScore * weights.companySizeWeight) +
        (indScore * weights.industryWeight) +
        ((lead.engagementScore || 0) * weights.engagementWeight) +
        ((srcScore || 0) * weights.sourceWeight)
    );
}

/**
 * Calculates opportunity win probability based on stage weights and engagement.
 */
function calculateWinProbability(stage, engagementScore, config) {
    const stages = config || {
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

    const w1 = stageWeights[stage] || 0.1;
    const engMultiplier = 0.5 + ((engagementScore || 0) / 100);

    let calcProb = Math.min(100, Math.round(w1 * engMultiplier * 100));
    if (stage === 'ClosedWon') calcProb = 100;
    if (stage === 'ClosedLost') calcProb = 0;

    return calcProb;
}

/**
 * Calculates customer risk index score.
 */
function calculateCustomerRiskIndex(lostDealsCount, staleContactsCount) {
    let riskScore = (lostDealsCount * 20) + (staleContactsCount * 10);
    return Math.min(100, riskScore);
}

/**
 * Calculates sales representative productivity score.
 */
function calculateRepProductivity(dealsClosed, revenueValue, activitiesCount, config) {
    const weights = config || {
        dealsClosedWeight: 0.5, revenueGeneratedWeight: 0.3, activitiesCompletedWeight: 0.2
    };

    return Math.round(
        (Math.min(dealsClosed * 5, 50) * weights.dealsClosedWeight) +
        (Math.min(revenueValue / 1000, 50) * weights.revenueGeneratedWeight) +
        (Math.min(activitiesCount * 2, 50) * weights.activitiesCompletedWeight)
    );
}

module.exports = {
    calculateRFM,
    forecastPipeline,
    scoreLead,
    calculateWinProbability,
    calculateCustomerRiskIndex,
    calculateRepProductivity
};
