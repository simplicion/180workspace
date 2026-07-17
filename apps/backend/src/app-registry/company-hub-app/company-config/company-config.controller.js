'use strict';

const { prisma } = require('@workspace/db');

/**
 * Modules that must always exist in enabledModules for the platform to work correctly.
 */
const REQUIRED_MODULES = ['work-logs', 'projects', 'tasks'];

exports.getCompanyConfig = async (req, res, next) => {
    try {
        const companyId = req.user.companyId;

        const company = await prisma.company.findUnique({
            where: { id: companyId }
        });

        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }

        const metadata = company.metadata || {};
        const safeCompany = { ...company };
        delete safeCompany.adminPasswordHash;
        
        const config = {
            ...safeCompany,
            companyId: company.id,
            companyName: company.name,
            companyEmail: company.adminEmail,
            companyLogo: company.logoUrl,
            enabledApps: metadata.enabledApps || [],
            enabledModules: metadata.enabledModules || [],
            ...metadata
        };

        // Self-healing migration: ensure all required modules are enabled
        const missingModules = REQUIRED_MODULES.filter(m => !config.enabledModules?.includes(m));
        if (missingModules.length > 0) {
            const updatedModules = [...(config.enabledModules || []), ...missingModules];
            await prisma.company.update({
                where: { id: companyId },
                data: {
                    metadata: {
                        ...metadata,
                        enabledModules: updatedModules
                    }
                }
            });
            config.enabledModules = updatedModules;
        }

        res.json({ config });
    } catch (err) { next(err); }
};

exports.updateCompanyConfig = async (req, res, next) => {
    try {
        const companyId = req.user.companyId;

        const company = await prisma.company.findUnique({
            where: { id: companyId }
        });

        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }

        const metadata = company.metadata || {};
        const updatedCompany = await prisma.company.update({
            where: { id: companyId },
            data: {
                name: req.body.companyName !== undefined ? req.body.companyName : company.name,
                logoUrl: req.body.companyLogo !== undefined ? req.body.companyLogo : company.logoUrl,
                metadata: {
                    ...metadata,
                    ...req.body
                }
            }
        });

        const safeCompany = { ...updatedCompany };
        delete safeCompany.adminPasswordHash;

        const config = {
            ...safeCompany,
            companyId: updatedCompany.id,
            companyName: updatedCompany.name,
            companyEmail: updatedCompany.adminEmail,
            companyLogo: updatedCompany.logoUrl,
            enabledApps: updatedCompany.metadata?.enabledApps || [],
            enabledModules: updatedCompany.metadata?.enabledModules || [],
            ...updatedCompany.metadata
        };

        res.json({ config, message: 'Company configuration updated successfully' });
    } catch (err) { next(err); }
};

exports.updateEnabledApps = async (req, res, next) => {
    try {
        const { apps } = req.body;
        if (!Array.isArray(apps)) return res.status(400).json({ error: 'Apps must be an array' });

        const companyId = req.user.companyId;

        const company = await prisma.company.findUnique({
            where: { id: companyId }
        });

        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }

        const metadata = company.metadata || {};
        const updatedCompany = await prisma.company.update({
            where: { id: companyId },
            data: {
                metadata: {
                    ...metadata,
                    enabledApps: apps
                }
            }
        });

        const config = {
            id: updatedCompany.id,
            companyId: updatedCompany.id,
            companyName: updatedCompany.name,
            companyEmail: updatedCompany.adminEmail,
            companyLogo: updatedCompany.logoUrl,
            enabledApps: updatedCompany.metadata?.enabledApps || [],
            enabledModules: updatedCompany.metadata?.enabledModules || []
        };

        res.json({ config, message: 'Apps updated successfully' });
    } catch (err) { next(err); }
};

exports.updateEnabledModules = async (req, res, next) => {
    try {
        const { modules } = req.body;
        if (!Array.isArray(modules)) return res.status(400).json({ error: 'Modules must be an array' });

        const companyId = req.user.companyId;

        const company = await prisma.company.findUnique({
            where: { id: companyId }
        });

        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }

        const metadata = company.metadata || {};
        const updatedCompany = await prisma.company.update({
            where: { id: companyId },
            data: {
                metadata: {
                    ...metadata,
                    enabledModules: modules
                }
            }
        });

        const config = {
            id: updatedCompany.id,
            companyId: updatedCompany.id,
            companyName: updatedCompany.name,
            companyEmail: updatedCompany.adminEmail,
            companyLogo: updatedCompany.logoUrl,
            enabledApps: updatedCompany.metadata?.enabledApps || [],
            enabledModules: updatedCompany.metadata?.enabledModules || []
        };

        res.json({ config, message: 'Modules updated successfully' });
    } catch (err) { next(err); }
};
