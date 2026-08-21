import { PlatformSettingsRepository } from '../repositories/platform-settings.repository';
import * as nodemailer from 'nodemailer';

export class PlatformSettingsService {
    static async getPlatformSettingsInstance() {
        return await PlatformSettingsRepository.getPlatformSettingsInstance();
    }

    static async getSettings() {
        return await this.getPlatformSettingsInstance();
    }

    static async updateSettings(data: any) {
        const settings = await this.getPlatformSettingsInstance();
        const allowed = [
            'platformName', 'maintenanceMode', 'maintenanceMessage', 'maxFreeUsers', 'supportEmail', 
            'logoUrl', 'faviconUrl', 'currency', 'smtpHost', 'smtpPort', 'smtpUser', 'smtpFrom', 
            'smtpSecure', 'allowSelfRegistration', 'trialDays', 'defaultPlanId', 'smtpPass', 
            'superAdminDbUri', 'dbHost', 'dbPort', 'dbUser', 'dbPass', 'dbName', 'dbSrv', 
            'brandingTagline', 'themeColor', 'companyLegalName', 'companyAddress', 'companyPhone', 
            'companyWebsite'
        ];
        
        const updateData: any = {};
        allowed.forEach(k => {
            if (data[k] !== undefined) {
                if (data[k] !== '********') {
                    updateData[k] = data[k];
                }
            }
        });

        return await PlatformSettingsRepository.updateSettings(settings.id, updateData);
    }

    static async toggleMaintenance() {
        const settings = await this.getPlatformSettingsInstance();
        return await PlatformSettingsRepository.updateSettings(settings.id, {
            maintenanceMode: !settings.maintenanceMode
        });
    }

    static async testDbConnection() {
        return await PlatformSettingsRepository.testDbConnection();
    }

    static async testEmailConnection(data: any) {
        const settings = await this.getPlatformSettingsInstance();
        
        const smtpHost = data.smtpHost || settings?.smtpHost;
        const smtpPort = data.smtpPort || settings?.smtpPort;
        const smtpUser = data.smtpUser || settings?.smtpUser;
        let smtpPass = data.smtpPass || settings?.smtpPass;
        if (smtpPass === '********') smtpPass = settings?.smtpPass;
        const smtpSecure = data.smtpSecure !== undefined ? data.smtpSecure : settings?.smtpSecure;
        const emailFrom = data.smtpFrom || settings?.smtpFrom || data.emailFrom || smtpUser;

        if (!smtpHost || !smtpUser || !smtpPass) {
            throw new Error('SMTP settings are not fully configured');
        }

        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: parseInt(smtpPort as any, 10) || 587,
            secure: smtpSecure === true || smtpSecure === 'true' || parseInt(smtpPort as any, 10) === 465,
            auth: {
                user: smtpUser,
                pass: smtpPass,
            },
        });

        await transporter.verify();

        await transporter.sendMail({
            from: emailFrom,
            to: smtpUser,
            subject: `${settings?.platformName || 'Your Platform'} — SMTP Connection Test`,
            text: `Connection test successful! Date: ${new Date().toLocaleString()}`,
            html: `<h3>Connection successful!</h3><p>Your SMTP settings are correctly configured for <b>${settings?.platformName || 'Your Platform'}</b>.</p><p>Tested on: ${new Date().toLocaleString()}</p>`,
        });

        return true;
    }
}
