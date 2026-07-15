'use strict';

/**
 * API Performance Instrumentation Middleware
 * Measures the execution time of various layers (auth, tenant resolution, etc.)
 * Logs a warning if the total request time exceeds SLOW_REQUEST_THRESHOLD_MS.
 */

const { v4: uuidv4 } = require('uuid');
const { queryMetricsStorage } = require('@workspace/db');

const SLOW_REQUEST_THRESHOLD_MS = parseInt(process.env.SLOW_REQUEST_THRESHOLD_MS || '200', 10);

module.exports = function performanceMiddleware(req, res, next) {
    req.performanceData = {
        requestId: req.headers['x-request-id'] || uuidv4(),
        startAt: Date.now(),
        method: req.method,
        route: req.originalUrl,
        
        // Detailed Duration Metrics
        checkpoints: {},
        authenticationDuration: 0,
        tenantResolutionDuration: 0,
        authorizationDuration: 0,
        validationDuration: 0,
        controllerDuration: 0,
        serviceDuration: 0,
        databaseDuration: 0,
        redisDuration: 0,
        serializationDuration: 0,
        responseDuration: 0,
        
        // Counters & Flags
        numberOfQueries: 0,
        cacheHit: false,
        cacheMiss: false,
        slowestQuery: { ms: 0, query: '' },
        
        _lastMark: Date.now(),

        // Mark a specific phase completion and assign duration
        mark: function(phase) {
            const now = Date.now();
            const duration = now - this._lastMark;
            this[phase] = duration;
            this._lastMark = now;
        },

        // Track sub-systems like DB or Redis without advancing the main sequence
        trackExternal: function(type, ms) {
            if (type === 'db') this.databaseDuration += ms;
            if (type === 'redis') this.redisDuration += ms;
        }
    };

    res.on('finish', () => {
        const endAt = Date.now();
        const totalDuration = endAt - req.performanceData.startAt;
        
        // Calculate the response sending time
        req.performanceData.responseDuration = endAt - req.performanceData._lastMark;

        const metrics = {
            requestId: req.performanceData.requestId,
            method: req.performanceData.method,
            route: req.performanceData.route,
            status: res.statusCode,
            totalDuration,
            authenticationDuration: req.performanceData.authenticationDuration,
            tenantResolutionDuration: req.performanceData.tenantResolutionDuration,
            authorizationDuration: req.performanceData.authorizationDuration,
            validationDuration: req.performanceData.validationDuration,
            controllerDuration: req.performanceData.controllerDuration,
            databaseDuration: req.performanceData.databaseDuration,
            redisDuration: req.performanceData.redisDuration,
            numberOfQueries: req.performanceData.numberOfQueries,
            cacheHit: req.performanceData.cacheHit,
            cacheMiss: req.performanceData.cacheMiss
        };

        if (totalDuration > SLOW_REQUEST_THRESHOLD_MS) {
            console.warn(`[PERF WARNING] ${metrics.method} ${metrics.route} took ${totalDuration}ms`);
        } else if (process.env.ENABLE_PERF_LOGS === 'true') {
            console.log(`[PERF INFO] ${metrics.method} ${metrics.route} | Total: ${totalDuration}ms | DB: ${metrics.databaseDuration}ms | Redis: ${metrics.redisDuration}ms`);
        }
        
        // Write to local perf log for automated agent analysis
        try {
            const fs = require('fs');
            const path = require('path');
            const logPath = path.join(process.cwd(), 'perf-analysis.jsonl');
            fs.appendFileSync(logPath, JSON.stringify(metrics) + '\n');
        } catch (e) {
            // Ignore
        }
    });

    if (queryMetricsStorage) {
        queryMetricsStorage.run(req.performanceData, () => {
            next();
        });
    } else {
        next();
    }
};
