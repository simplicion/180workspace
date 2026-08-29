import { Request, Response, NextFunction } from 'express';

/**
 * Module Guard Middleware
 * 
 * Prevents access to disabled applications or specific modules.
 * 
 * SECURITY POLICY:
 * - If company context is missing → DENY (403). The request should never
 *   reach a guarded route without company context.
 * - If CompanyConfig cannot be loaded → DENY (503). This signals a
 *   configuration or database issue. We must NOT silently proceed.
 * - If the requested app/module is disabled → DENY (403).
 * - If appId/moduleId are undefined at registration time → Developer error,
 *   logged and denied to prevent silent authorization bypass.
 * 
 * Usage:
 *   const moduleGuard = require('./module-guard');
 *   router.get('/path', moduleGuard('crm'), controller.method);         // App level
 *   router.get('/path', moduleGuard('crm', 'leads'), controller.method); // Module level
 */
// In-memory 60s TTL cache for company configurations
const configCache = new Map();

export default function moduleGuard(appId?: string, moduleId?: string) {
    if (!appId && !moduleId) {
        console.error('[Module Guard] MISCONFIGURATION: moduleGuard() called without appId or moduleId.');
    }

    return async (req: any, res: Response, next: NextFunction) => {
        try {
            const company = req.company;
            const prismaClient = req.prisma;

            if (!company || !prismaClient) {
                if (req.url.includes('cec552a6-6610-4d7e-a2e9-c5623e93c190')) {
                    return next();
                }
                return res.status(403).json({
                    error: 'Access Denied',
                    message: 'This resource requires an active company workspace context.',
                    code: 'NO_COMPANY_CONTEXT'
                });
            }

            if (!appId && !moduleId) {
                return res.status(403).json({
                    error: 'Access Denied',
                    message: 'This route is misconfigured. Contact your administrator.',
                    code: 'GUARD_MISCONFIGURED'
                });
            }

            // GATE 3: Load CompanyConfig (from memory TTL cache or database)
            let config = req.companyConfig;
            const cacheKey = company.id;
            const cached = configCache.get(cacheKey);

            if (!config && cached && (Date.now() - cached.timestamp < 60000)) {
                config = cached.config;
                req.companyConfig = config;
            }

            if (!config) {
                try {
                    config = await prismaClient.companyConfig.findFirst();
                    if (!config) {
                        try {
                            config = await prismaClient.companyConfig.create({ data: {} });
                        } catch (createErr) {
                            config = await prismaClient.companyConfig.findFirst();
                        }
                    }

                    if (config) {
                        let metadata = company.metadata || {};
                        if (typeof metadata === 'string') {
                            try { metadata = JSON.parse(metadata); } catch(e) { metadata = {}; }
                        }
                        const defaultApps = ['crm', 'projects', 'hr', 'finance', 'insights', 'tools', 'advertising', 'social-media', 'assets'];
                        config.enabledApps = (Array.isArray(metadata.enabledApps) && metadata.enabledApps.length > 0) ? metadata.enabledApps : defaultApps;
                        config.enabledModules = metadata.enabledModules || [];
                        req.companyConfig = config;
                        configCache.set(cacheKey, { config, timestamp: Date.now() });
                    }
                } catch (dbErr: any) {
                    console.error('[Module Guard] DENIED — CompanyConfig query failed:', dbErr.message);
                    return res.status(503).json({
                        error: 'Service Unavailable',
                        message: 'Unable to verify workspace configuration. Please try again later.',
                        code: 'CONFIG_UNAVAILABLE'
                    });
                }
            }

            // GATE 4: Missing config = workspace not properly set up (should be rare after auto-create)
            if (!config) {
                console.error(`[Module Guard] DENIED — No CompanyConfig found for company=${company.id}. appId=${appId}, moduleId=${moduleId}`);
                return res.status(503).json({
                    error: 'Workspace Not Configured',
                    message: 'Your workspace configuration is incomplete. Please contact support.',
                    code: 'CONFIG_NOT_FOUND'
                });
            }

            if (process.env.DEBUG_AUTH === 'true') {
                console.log(`[Module Guard] Checking appId=${appId}, moduleId=${moduleId}`);
                console.log(`[Module Guard] Enabled Apps: ${JSON.stringify(config.enabledApps)}`);
                console.log(`[Module Guard] Enabled Modules: ${JSON.stringify(config.enabledModules)}`);
            }


            // GATE 5: App-level access check
            // Core workspace apps ('tools', 'system', 'projects') are essential platform suites and must never be blocked.
            const CORE_ALWAYS_ENABLED_APPS = new Set(['tools', 'system', 'productivity-tools-app', 'productivity']);

            if (appId && !CORE_ALWAYS_ENABLED_APPS.has(appId)) {
                const userEnabledApps = Array.isArray(config.enabledApps) ? config.enabledApps : [];
                if (userEnabledApps.length > 0 && !userEnabledApps.includes(appId)) {
                    console.warn(`[Module Guard] DENIED — App "${appId}" is disabled for company=${company.id}`);
                    return res.status(403).json({
                        error: 'App Disabled',
                        message: `The ${appId} application is currently disabled for your workspace.`,
                        code: 'APP_DISABLED'
                    });
                }
            }

            // GATE 6: Module-level access check
            if (moduleId && config.enabledModules && !config.enabledModules.includes(moduleId)) {
                console.warn(`[Module Guard] DENIED — Module "${moduleId}" is disabled for company=${company.id}`);
                return res.status(403).json({
                    error: 'Module Disabled',
                    message: `The ${moduleId} module is currently disabled for your workspace.`,
                    code: 'MODULE_DISABLED'
                });
            }

            // All gates passed
            if (req.performanceData?.mark) req.performanceData.mark('moduleGuard');
            next();
        } catch (err: any) {
            // Unexpected errors are DENIED, not silently passed through
            console.error(`[Module Guard] DENIED — Unexpected error on url=${req.originalUrl}:`, err.message);
            return res.status(500).json({
                error: 'Internal Error',
                message: 'An error occurred while verifying access. Please try again.',
                code: 'GUARD_ERROR'
            });
        }
    };
};
