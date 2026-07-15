'use strict';

/**
 * Pure Mathematical & Statistical Algorithms for Sales Intelligence
 */

// [8] Levenshtein Distance for String Similarity (Lead Deduplication)
exports.levenshteinDistance = (a, b) => {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
            }
        }
    }
    return matrix[b.length][a.length];
};

exports.stringSimilarity = (a, b) => {
    if (!a || !b) return 0;
    a = a.toLowerCase().trim();
    b = b.toLowerCase().trim();
    if (a === b) return 1.0;
    const distance = exports.levenshteinDistance(a, b);
    const maxLen = Math.max(a.length, b.length);
    return maxLen === 0 ? 1.0 : (maxLen - distance) / maxLen;
};

// [22] Cosine Similarity for Vectors (Account Lookalike Modeling)
exports.cosineSimilarity = (vecA, vecB) => {
    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

// [14] Simplified K-Means Clustering (1D for simplicity, e.g., segmenting by revenue or engagement)
exports.simple1DKMeans = (dataPoints, k = 3, maxIterations = 10) => {
    if (!dataPoints || dataPoints.length === 0) return [];
    if (dataPoints.length <= k) return dataPoints.map(p => ({ point: p, cluster: 0 }));

    // Initialize centroids randomly
    let centroids = [];
    let min = Math.min(...dataPoints);
    let max = Math.max(...dataPoints);
    for (let i = 0; i < k; i++) centroids.push(min + (max - min) * (i / (k - 1 || 1)));

    let assignments = new Array(dataPoints.length).fill(0);

    for (let iter = 0; iter < maxIterations; iter++) {
        // Assign
        let changed = false;
        for (let i = 0; i < dataPoints.length; i++) {
            let minDist = Infinity;
            let cluster = 0;
            for (let j = 0; j < k; j++) {
                let dist = Math.abs(dataPoints[i] - centroids[j]);
                if (dist < minDist) {
                    minDist = dist;
                    cluster = j;
                }
            }
            if (assignments[i] !== cluster) changed = true;
            assignments[i] = cluster;
        }

        if (!changed) break;

        // Recalculate centroids
        let sums = new Array(k).fill(0);
        let counts = new Array(k).fill(0);
        for (let i = 0; i < dataPoints.length; i++) {
            sums[assignments[i]] += dataPoints[i];
            counts[assignments[i]]++;
        }
        for (let j = 0; j < k; j++) {
            if (counts[j] > 0) centroids[j] = sums[j] / counts[j];
        }
    }

    return assignments;
};

// [15] Logistic Regression (Sigmoid function for odds conversion)
exports.sigmoid = (t) => {
    return 1 / (1 + Math.exp(-t));
};

// [20] Simple Moving Average (SMA) / Exponential Moving Average (EMA)
exports.calculateEMA = (data, period = 3) => {
    if (!data || data.length === 0) return [];
    const k = 2 / (period + 1);
    let emaArray = [data[0]];
    for (let i = 1; i < data.length; i++) {
        emaArray.push(data[i] * k + emaArray[i - 1] * (1 - k));
    }
    return emaArray;
};

// [21] Apriori-style Frequent Itemsets (Market Basket Analysis) - Simplified
exports.getFrequentPairs = (baskets, minSupport = 0.1) => {
    const pairCounts = {};
    const totalBaskets = baskets.length;

    baskets.forEach(basket => {
        const items = Array.from(new Set(basket)).sort();
        for (let i = 0; i < items.length; i++) {
            for (let j = i + 1; j < items.length; j++) {
                const pair = `${items[i]}|${items[j]}`;
                pairCounts[pair] = (pairCounts[pair] || 0) + 1;
            }
        }
    });

    const frequentPairs = [];
    for (const [pair, count] of Object.entries(pairCounts)) {
        const support = count / totalBaskets;
        if (support >= minSupport) {
            const [itemA, itemB] = pair.split('|');
            frequentPairs.push({ itemA, itemB, support });
        }
    }
    return frequentPairs.sort((a, b) => b.support - a.support);
};

// [25] Keyword Extractor for Action Items
exports.extractActionItems = (text) => {
    if (!text) return [];
    const actionKeywords = ['need to', 'will do', 'will send', 'follow up', 'schedule', 'action item', 'to-do', 'todo'];
    const sentences = text.match(/[^\.!\?]+[\.!\?]+/g) || [text];

    const actionItems = [];
    sentences.forEach(sentence => {
        const lower = sentence.toLowerCase();
        if (actionKeywords.some(kw => lower.includes(kw))) {
            actionItems.push(sentence.trim());
        }
    });
    return actionItems;
};
