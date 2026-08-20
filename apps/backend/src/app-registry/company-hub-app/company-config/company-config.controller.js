const { CompanyConfigService } = require('@workspace/company');

exports.getCompanyConfig = async (req, res, next) => {
    try {
        const companyId = req.user.companyId;
        const config = await CompanyConfigService.getCompanyConfig(companyId);
        res.json({ config });
    } catch (err) {
        if (err.message === 'Company not found') {
            return res.status(404).json({ error: err.message });
        }
        next(err);
    }
};

exports.updateCompanyConfig = async (req, res, next) => {
    try {
        const companyId = req.user.companyId;
        const { config, updatedCompany } = await CompanyConfigService.updateCompanyConfig(companyId, req.body);

        // Clear redis cache to prevent stale data
        const { redis } = require('../../../system-configs/config/redis');
        if (redis) {
            try {
                await redis.del(`company:${companyId}`);
                if (req.user && req.user.id) {
                    await redis.del(`init:user:${req.user.id}:company:${companyId}`);
                }
                const initKeys = await redis.keys(`init:user:*:company:${companyId}`);
                if (initKeys && initKeys.length > 0) {
                    await redis.del(...initKeys);
                }
            } catch (cacheErr) {
                console.warn('[Cache] Failed to clear company config cache:', cacheErr.message);
            }
        }

        res.json({ config, message: 'Company configuration updated successfully' });
    } catch (err) {
        if (err.message === 'Company not found') {
            return res.status(404).json({ error: err.message });
        }
        next(err);
    }
};

exports.updateEnabledApps = async (req, res, next) => {
    try {
        const { apps } = req.body;
        const companyId = req.user.companyId;

        const { config, updatedCompany } = await CompanyConfigService.updateEnabledApps(companyId, apps);

        const { redis } = require('../../../system-configs/config/redis');
        if (redis) {
            try {
                await redis.del(`company:${companyId}`);
                if (req.user && req.user.id) {
                    await redis.del(`init:user:${req.user.id}:company:${companyId}`);
                }
                const initKeys = await redis.keys(`init:user:*:company:${companyId}`);
                if (initKeys && initKeys.length > 0) {
                    await redis.del(...initKeys);
                }
            } catch (cacheErr) {
                console.warn('[Cache] Failed to clear company apps cache:', cacheErr.message);
            }
        }

        res.json({ config, message: 'Apps updated successfully' });
    } catch (err) {
        if (err.message === 'Apps must be an array') {
            return res.status(400).json({ error: err.message });
        }
        if (err.message === 'Company not found') {
            return res.status(404).json({ error: err.message });
        }
        next(err);
    }
};

exports.updateEnabledModules = async (req, res, next) => {
    try {
        const { modules } = req.body;
        const companyId = req.user.companyId;

        const { config, updatedCompany } = await CompanyConfigService.updateEnabledModules(companyId, modules);

        const { redis } = require('../../../system-configs/config/redis');
        if (redis) {
            try {
                await redis.del(`company:${companyId}`);
                if (req.user && req.user.id) {
                    await redis.del(`init:user:${req.user.id}:company:${companyId}`);
                }
                const initKeys = await redis.keys(`init:user:*:company:${companyId}`);
                if (initKeys && initKeys.length > 0) {
                    await redis.del(...initKeys);
                }
            } catch (cacheErr) {
                console.warn('[Cache] Failed to clear company modules cache:', cacheErr.message);
            }
        }

        res.json({ config, message: 'Modules updated successfully' });
    } catch (err) {
        if (err.message === 'Modules must be an array') {
            return res.status(400).json({ error: err.message });
        }
        if (err.message === 'Company not found') {
            return res.status(404).json({ error: err.message });
        }
        next(err);
    }
};
