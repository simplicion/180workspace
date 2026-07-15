'use strict';

const { prisma } = require('@workspace/db');

const getPlatformSettingsInstance = async () => {
    let settings = await prisma.platformSettings.findFirst();
    if (!settings) {
        settings = await prisma.platformSettings.create({
            data: {
                platformName: 'IMS',
                maintenanceMode: false,
                maintenanceMessage: 'System is under maintenance. Please try again shortly.',
                maxFreeUsers: 5,
                supportEmail: 'support@ims.system',
                currency: 'INR'
            }
        });
    }
    return settings;
};

exports.get = async (req, res) => {
    try {
        const settings = await getPlatformSettingsInstance();
        res.json({ settings });
    } catch (err) {
        console.error('Fetch Platform Settings error:', err);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
};

exports.update = async (req, res) => {
    try {
        const settings = await getPlatformSettingsInstance();
        const allowed = ['platformName', 'maintenanceMode', 'maintenanceMessage', 'maxFreeUsers', 'supportEmail', 'logoUrl', 'faviconUrl', 'currency', 'smtpHost', 'smtpPort', 'smtpUser', 'smtpFrom', 'smtpSecure', 'allowSelfRegistration', 'trialDays', 'defaultPlanId', 'smtpPass', 'superAdminDbUri', 'dbHost', 'dbPort', 'dbUser', 'dbPass', 'dbName', 'dbSrv', 'brandingTagline', 'themeColor', 'companyLegalName', 'companyAddress', 'companyPhone', 'companyWebsite'];
        
        const updateData = {};
        allowed.forEach(k => {
            if (req.body[k] !== undefined) updateData[k] = req.body[k];
        });

        const updatedSettings = await prisma.platformSettings.update({
            where: { id: settings.id },
            data: updateData
        });

        res.json({ settings: updatedSettings, message: 'Settings updated' });
    } catch (err) {
        console.error('Update Platform Settings error:', err);
        res.status(500).json({ error: 'Failed to update settings' });
    }
};

exports.toggleMaintenance = async (req, res) => {
    try {
        const settings = await getPlatformSettingsInstance();
        const updatedSettings = await prisma.platformSettings.update({
            where: { id: settings.id },
            data: { maintenanceMode: !settings.maintenanceMode }
        });
        res.json({ maintenanceMode: updatedSettings.maintenanceMode, message: `Maintenance mode ${updatedSettings.maintenanceMode ? 'enabled' : 'disabled'}` });
    } catch (err) {
        console.error('Toggle Maintenance error:', err);
        res.status(500).json({ error: 'Failed to toggle maintenance' });
    }
};

exports.testDbConnection = async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ message: 'Connection established successfully' });
    } catch (err) {
        res.status(400).json({ error: `Connection failed: ${err.message}` });
    }
};

exports.testEmailConnection = async (req, res) => {
    try {
        const settings = await getPlatformSettingsInstance();
        
        const smtpHost = req.body.smtpHost || settings?.smtpHost;
        const smtpPort = req.body.smtpPort || settings?.smtpPort;
        const smtpUser = req.body.smtpUser || settings?.smtpUser;
        const smtpPass = req.body.smtpPass || settings?.smtpPass;
        const smtpSecure = req.body.smtpSecure !== undefined ? req.body.smtpSecure : settings?.smtpSecure;
        const emailFrom = req.body.smtpFrom || settings?.emailFrom || req.body.emailFrom || smtpUser;

        if (!smtpHost || !smtpUser || !smtpPass) {
            return res.status(400).json({ error: 'SMTP settings are not fully configured' });
        }

        const nodemailer = require('nodemailer');

        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpSecure !== undefined ? smtpSecure : (smtpPort === 465),
            auth: {
                user: smtpUser,
                pass: smtpPass,
            },
        });

        await transporter.verify();

        await transporter.sendMail({
            from: emailFrom,
            to: smtpUser,
            subject: `${settings?.platformName || 'Your Platform'} â€” SMTP Connection Test`,
            text: `Connection test successful! Date: ${new Date().toLocaleString()}`,
            html: `<h3>Connection successful!</h3><p>Your SMTP settings are correctly configured for <b>${settings?.platformName || 'Your Platform'}</b>.</p><p>Tested on: ${new Date().toLocaleString()}</p>`,
        });

        res.json({ message: 'Test email sent successfully! Please check your inbox.' });
    } catch (error) {
        console.error('Superadmin Email connection test failed:', error);
        res.status(500).json({
            error: 'Email connection test failed',
            details: error.message
        });
    }
};
