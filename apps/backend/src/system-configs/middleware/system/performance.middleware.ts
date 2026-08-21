import { v4 as uuidv4 } from 'uuid';
import { queryMetricsStorage } from '@workspace/db';
import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

/**
 * API Performance Instrumentation Middleware
 * Measures the execution time of various layers (auth, company resolution, etc.)
 * Logs a warning if the total request time exceeds SLOW_REQUEST_THRESHOLD_MS.
 */
const SLOW_REQUEST_THRESHOLD_MS = parseInt(process.env.SLOW_REQUEST_THRESHOLD_MS || '200', 10);

export default function performanceMiddleware(req: any, res: Response, next: NextFunction) {
    req.performanceData = {
        requestId: req.headers['x-request-id'] || uuidv4(),
        startAt: Date.now(),
        method: req.method,
        route: req.originalUrl,
        
        // Detailed Duration Metrics
        checkpoints: {},
        authenticationDuration: 0,
        companyResolutionDuration: 0,
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
        mark: function(phase: string) {
            const now = Date.now();
            const duration = now - this._lastMark;
            this[phase] = duration;
            if (phase === 'companyResolutionDuration') {
                this.companyResolutionDuration = duration;
            }
            this._lastMark = now;
        },

        // Track sub-systems like DB or Redis without advancing the main sequence
        trackExternal: function(type: string, ms: number) {
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
            companyResolutionDuration: req.performanceData.companyResolutionDuration,

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
}
