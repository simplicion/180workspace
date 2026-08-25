import { prisma, requestContext } from '@workspace/db';

const METADATA_FIELDS = [
    'aiProvider', 'openaiKey', 'geminiKey', 'claudeKey', 'googleSheetsId',
    'lastAiTestStatus', 'lastAiTestDate', 'lastAiTestError',
    'lastEmailTestStatus', 'lastEmailTestDate', 'lastEmailTestError',
    'lastStorageTestStatus', 'lastStorageTestDate', 'lastStorageTestError',
    'lastDbTestStatus', 'lastDbTestDate', 'lastDbTestError',
    'customAiUrl', 'customAiKey', 'customAiModel',
    'smtpHost', 'smtpPort', 'smtpUser', 'smtpPass', 'smtpSecure', 'emailFrom',
    'googleDriveServiceAccount', 'googleDriveFolderId',
    'cloudinaryCloudName', 'cloudinaryApiKey', 'cloudinaryApiSecret',
    'dbHost', 'dbPort', 'dbUser', 'dbPass', 'dbName', 'dbSrv',
    'useManualUri', 'manualUri', 'plausibleApiKey', 'googleDriveTokens', 'plausibleSiteId'
];

export class SettingsService {
    static async getCompanyMetadata() {
        const companyId = requestContext.getStore()?.companyId as string;
        if (!companyId) return {};
        const company = await prisma.company.findUnique({
            where: { id: companyId }
        });
        let currentMeta = company?.metadata || {};
        if (typeof currentMeta === 'string') {
            try { currentMeta = JSON.parse(currentMeta); } catch (e) { currentMeta = {}; }
        }
        if (typeof currentMeta === 'string') {
            try { currentMeta = JSON.parse(currentMeta); } catch (e) { currentMeta = {}; }
        }
        return currentMeta as any;
    }

    static async updateCompanyMetadata(updateData: any, clearCompanyCache?: (id: string) => Promise<void>) {
        const companyId = requestContext.getStore()?.companyId as string;
        if (!companyId) return;
        const currentMeta = await this.getCompanyMetadata();
        
        await prisma.company.update({
            where: { id: companyId },
            data: {
                metadata: {
                    ...currentMeta,
                    ...updateData
                }
            }
        });

        if (clearCompanyCache) {
            await clearCompanyCache(companyId);
        }
    }

    static async getSettings(user: any, company: any) {
        const companyId = requestContext.getStore()?.companyId as string;
        let settings = companyId ? await prisma.settings.findFirst({
            where: { companyId }
        }) : null;

        if (!settings && companyId) {
            settings = await (prisma.settings.create as any)({
                data: {
                    companyName: company?.name || '',
                    logoUrl: '',
                    themeColor: '#4f46e5',
                }
            });
        }

        const metadata = companyId ? await this.getCompanyMetadata() : {};
        const mergedSettings = { ...settings } as any;
        METADATA_FIELDS.forEach(field => {
            mergedSettings[field] = metadata[field] !== undefined ? metadata[field] : (field.endsWith('Status') ? 'none' : '');
        });

        return mergedSettings;
    }

    static async updateSettings(data: any, user: any, company: any, dependencies: any) {
        const isPrivileged = ['admin', 'manager', 'BMSP_SUPER_ADMIN', 'BMSP_ADMIN'].includes(user.role);
        if (!isPrivileged) {
            throw new Error('Forbidden');
        }

        const bodyData = { ...data };
        const forbiddenFields = ['id', 'companyId', 'createdAt', 'updatedAt'];
        forbiddenFields.forEach(f => delete bodyData[f]);

        const companyId = requestContext.getStore()?.companyId as string;
        const subscription = companyId ? await prisma.subscription.findFirst({
            where: { companyId: companyId, status: { in: ['ACTIVE', 'active', 'trial', 'TRIAL'] } },
            include: { plan: true },
            orderBy: { createdAt: 'desc' }
        }) : null;

        let plan = subscription?.plan;
        if (!plan) {
             plan = await prisma.plan.findFirst({
                 where: { planName: { contains: 'Kickstart' } }
             }) as any;
        }

        if (!plan) {
            throw new Error('Plan details not found.');
        }

        const aiFields = ['aiProvider', 'openaiKey', 'geminiKey', 'claudeKey', 'customAiKey', 'customAiUrl', 'customAiModel'];
        const smtpFields = ['smtpHost', 'smtpPort', 'smtpUser', 'smtpPass', 'emailFrom'];

        const hasAIAssistant = plan.features.some((f: string) => f.toLowerCase().includes('ai assistant'));
        const hasEmailServices = plan.features.some((f: string) => f.toLowerCase().includes('email smtp'));

        const tryingToUpdateAI = aiFields.some(f => {
            const val = bodyData[f];
            if (f === 'aiProvider') return val && val !== 'none';
            return val && val !== '********' && val !== '';
        });

        const tryingToUpdateSMTP = smtpFields.some(f => {
            const val = bodyData[f];
            return val && val !== '********' && val !== '';
        });

        if (tryingToUpdateAI && !hasAIAssistant) {
            console.log(`[ACCESS DENIED] Company ${companyId} attempted to configure AI Assistant without the required plan.`);
            throw new Error(`The AI Assistant feature is not available on the ${plan.planName} plan. Please upgrade your plan to access this feature.`);
        }

        if (tryingToUpdateSMTP && !hasEmailServices) {
            console.log(`[ACCESS DENIED] Company ${companyId} attempted to configure Custom SMTP without the required plan.`);
            throw new Error(`The Custom Email SMTP feature is not available on the ${plan.planName} plan. Please upgrade your plan to access this feature.`);
        }

        const metadataUpdate: any = {};
        const settingsUpdate: any = {};

        Object.keys(bodyData).forEach(key => {
            if (METADATA_FIELDS.includes(key)) {
                metadataUpdate[key] = bodyData[key];
            } else {
                settingsUpdate[key] = bodyData[key];
            }
        });

        const maskedFields = ['openaiKey', 'geminiKey', 'claudeKey', 'customAiKey', 'smtpPass', 'cloudinaryApiSecret', 'dbPass', 'recruitmentApiKey'];
        maskedFields.forEach(field => {
            if (metadataUpdate[field] === '********') {
                delete metadataUpdate[field];
            }
            if (settingsUpdate[field] === '********') {
                delete settingsUpdate[field];
            }
        });

        // (companyId is already extracted above as const companyId = requestContext.getStore()?.companyId as string;)
        let settings = companyId ? await prisma.settings.findFirst({
            where: { companyId }
        }) : null;
        let updatedSettings;

        if (!settings && companyId) {
            updatedSettings = await (prisma.settings.create as any)({
                data: {
                    ...settingsUpdate,
                    companyId: companyId || undefined
                }
            });
        } else {
            if (Object.keys(settingsUpdate).length > 0) {
                updatedSettings = await prisma.settings.update({
                    where: { id: settings!.id },
                    data: settingsUpdate
                });
            } else {
                updatedSettings = settings;
            }
        }

        if (Object.keys(metadataUpdate).length > 0 && companyId) {
            await this.updateCompanyMetadata(metadataUpdate, dependencies.clearCompanyCache);
        }

        if (dependencies.redis) {
            try {
                await dependencies.redis.del(`company:${companyId}`);
                if (user && user.id) {
                    await dependencies.redis.del(`init:user:${user.id}:company:${companyId}`);
                }
                const initKeys = await dependencies.redis.keys(`init:user:*:company:${companyId}`);
                if (initKeys && initKeys.length > 0) {
                    await dependencies.redis.del(...initKeys);
                }
            } catch (cacheErr: any) {
                console.warn('[Cache] Failed to clear settings cache:', cacheErr.message);
            }
        }

        const metadata = companyId ? await this.getCompanyMetadata() : {};
        const mergedSettings = { ...updatedSettings } as any;
        METADATA_FIELDS.forEach(field => {
            mergedSettings[field] = metadata[field] !== undefined ? metadata[field] : (field.endsWith('Status') ? 'none' : '');
        });

        return mergedSettings;
    }

    static async testAiConnection(user: any, dependencies: any) {
        if (!['admin', 'manager'].includes(user.role)) {
            throw new Error('Forbidden');
        }

        const companyId = requestContext.getStore()?.companyId as string;
        const metadata = await this.getCompanyMetadata();
        if (!metadata || !metadata.aiProvider || metadata.aiProvider === 'none') {
            throw new Error('AI provider is not selected');
        }

        const provider = metadata.aiProvider;
        let testSuccess = false;

        if (provider === 'gemini') {
            if (!metadata.geminiKey) throw new Error('Gemini API Key missing');
            const result = await dependencies.testGemini(metadata.geminiKey);
            if (result) testSuccess = true;
        } else if (provider === 'openai') {
            if (!metadata.openaiKey) throw new Error('OpenAI API Key missing');
            const result = await dependencies.testOpenAI(metadata.openaiKey);
            if (result) testSuccess = true;
        } else if (provider === 'claude') {
            if (!metadata.claudeKey) throw new Error('Claude API Key missing');
            const result = await dependencies.testClaude(metadata.claudeKey);
            if (result) testSuccess = true;
        } else if (provider === 'custom') {
            if (!metadata.customAiKey) throw new Error('Custom API Key missing');
            if (!metadata.customAiUrl) throw new Error('Custom Base URL missing');
            if (!metadata.customAiModel) throw new Error('Custom Model Name missing');
            
            const result = await dependencies.testCustomAI(metadata.customAiKey, metadata.customAiUrl, metadata.customAiModel);
            if (result) testSuccess = true;
        }

        let updatedSettings = companyId ? await prisma.settings.findFirst({
            where: { companyId }
        }) : null;

        if (testSuccess) {
            await this.updateCompanyMetadata({
                lastAiTestStatus: 'success',
                lastAiTestDate: new Date(),
                lastAiTestError: null
            }, dependencies.clearCompanyCache);

            const freshMeta = await this.getCompanyMetadata();
            const merged = { ...updatedSettings } as any;
            METADATA_FIELDS.forEach(field => {
                merged[field] = freshMeta[field] !== undefined ? freshMeta[field] : '';
            });

            return { message: `${provider.toUpperCase()} connection successful!`, settings: merged };
        } else {
            throw new Error('Test failed to return a response');
        }
    }

    static async logAiTestFailure(user: any, errorMessage: string, body: any, dependencies: any) {
        const companyId = requestContext.getStore()?.companyId as string;
        let merged = { ...body };
        try {
            if (companyId) {
                await this.updateCompanyMetadata({
                    lastAiTestStatus: 'failure',
                    lastAiTestDate: new Date(),
                    lastAiTestError: errorMessage
                }, dependencies.clearCompanyCache);

                const updatedSettings = await prisma.settings.findFirst({
                    where: { companyId }
                });
                const freshMeta = await this.getCompanyMetadata();
                merged = { ...updatedSettings };
                METADATA_FIELDS.forEach(field => {
                    merged[field] = freshMeta[field] !== undefined ? freshMeta[field] : '';
                });
            }
        } catch (innerError) {
            console.error('Failed to log AI test error:', innerError);
        }
        return merged;
    }

    static async testEmailConnection(data: any, user: any, dependencies: any) {
        if (!['admin', 'manager'].includes(user.role)) {
            throw new Error('Forbidden');
        }

        const companyId = requestContext.getStore()?.companyId as string;
        const settings = companyId ? await prisma.settings.findFirst({
            where: { companyId }
        }) : null;
        const metadata = companyId ? await this.getCompanyMetadata() : {};
        
        const smtpHost = data.smtpHost || metadata.smtpHost || (settings as any)?.smtpHost;
        const smtpPort = data.smtpPort || metadata.smtpPort || (settings as any)?.smtpPort;
        const smtpUser = data.smtpUser || metadata.smtpUser || (settings as any)?.smtpUser;
        let smtpPass = data.smtpPass || metadata.smtpPass || (settings as any)?.smtpPass;
        if (smtpPass === '********') smtpPass = metadata.smtpPass || (settings as any)?.smtpPass;
        const smtpSecure = data.smtpSecure !== undefined ? data.smtpSecure : (metadata.smtpSecure !== undefined ? metadata.smtpSecure : (settings as any)?.smtpSecure);
        const emailFrom = data.smtpFrom || metadata.emailFrom || (settings as any)?.emailFrom || data.emailFrom || smtpUser;

        if (!smtpHost || !smtpUser || !smtpPass) {
            throw new Error('SMTP settings are not fully configured');
        }

        await dependencies.testSmtp({
            smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure, emailFrom, companyName: settings?.companyName
        });

        await this.updateCompanyMetadata({
            lastEmailTestStatus: 'success',
            lastEmailTestDate: new Date(),
            lastEmailTestError: null
        }, dependencies.clearCompanyCache);

        const freshMeta = await this.getCompanyMetadata();
        const merged = { ...settings } as any;
        METADATA_FIELDS.forEach(field => {
            merged[field] = freshMeta[field] !== undefined ? freshMeta[field] : '';
        });

        return merged;
    }

    static async logEmailTestFailure(user: any, errorMessage: string, body: any, dependencies: any) {
        const companyId = requestContext.getStore()?.companyId as string;
        let merged = { ...body };
        try {
            if (companyId) {
                await this.updateCompanyMetadata({
                    lastEmailTestStatus: 'failure',
                    lastEmailTestDate: new Date(),
                    lastEmailTestError: errorMessage
                }, dependencies.clearCompanyCache);
                
                const settings = await prisma.settings.findFirst({
                    where: { companyId }
                });
                const freshMeta = await this.getCompanyMetadata();
                merged = { ...settings };
                METADATA_FIELDS.forEach(field => {
                    merged[field] = freshMeta[field] !== undefined ? freshMeta[field] : '';
                });
            }
        } catch (innerError) {
            console.error('Failed to log email test error:', innerError);
        }
        return merged;
    }

    static async testStorageConnection(user: any, dependencies: any) {
        if (!['admin', 'manager'].includes(user.role)) {
            throw new Error('Forbidden');
        }

        const companyId = requestContext.getStore()?.companyId as string;
        const settings = companyId ? await prisma.settings.findFirst({
            where: { companyId }
        }) : null;

        if (!settings || settings.storageMode === 'local') {
            throw new Error('Storage mode is set to local or not configured');
        }

        if (settings.storageMode === 'google_drive') {
            const metadata = await this.getCompanyMetadata();
            (settings as any).googleDriveServiceAccount = metadata.googleDriveServiceAccount || (settings as any).googleDriveServiceAccount;
            (settings as any).googleDriveFolderId = metadata.googleDriveFolderId || (settings as any).googleDriveFolderId;
            await dependencies.testGoogleDrive(settings);

            await this.updateCompanyMetadata({
                lastStorageTestStatus: 'success',
                lastStorageTestDate: new Date(),
                lastStorageTestError: null
            }, dependencies.clearCompanyCache);

            const freshMeta = await this.getCompanyMetadata();
            const merged = { ...settings } as any;
            METADATA_FIELDS.forEach(field => {
                merged[field] = freshMeta[field] !== undefined ? freshMeta[field] : '';
            });

            return { message: 'Google Drive connection successful!', settings: merged };
        }

        if (settings.storageMode === 'cloudinary') {
            const metadata = await this.getCompanyMetadata();
            const cloudinaryCloudName = metadata.cloudinaryCloudName || (settings as any).cloudinaryCloudName;
            const cloudinaryApiKey = metadata.cloudinaryApiKey || (settings as any).cloudinaryApiKey;
            const cloudinaryApiSecret = metadata.cloudinaryApiSecret || (settings as any).cloudinaryApiSecret;

            if (!cloudinaryCloudName || !cloudinaryApiKey || !cloudinaryApiSecret) {
                throw new Error('Cloudinary credentials are not fully configured in settings');
            }

            await dependencies.testCloudinary({
                cloudName: cloudinaryCloudName,
                apiKey: cloudinaryApiKey,
                apiSecret: cloudinaryApiSecret
            });

            await this.updateCompanyMetadata({
                lastStorageTestStatus: 'success',
                lastStorageTestDate: new Date(),
                lastStorageTestError: null
            }, dependencies.clearCompanyCache);

            const freshMeta = await this.getCompanyMetadata();
            const merged = { ...settings } as any;
            METADATA_FIELDS.forEach(field => {
                merged[field] = freshMeta[field] !== undefined ? freshMeta[field] : '';
            });

            return { message: 'Cloudinary connection successful!', settings: merged };
        }

        throw new Error('Unsupported storage mode for testing');
    }

    static async logStorageTestFailure(user: any, errorMessage: string, dependencies: any) {
        const companyId = requestContext.getStore()?.companyId as string;
        await this.updateCompanyMetadata({
            lastStorageTestStatus: 'failure',
            lastStorageTestDate: new Date(),
            lastStorageTestError: errorMessage
        }, dependencies.clearCompanyCache);

        const settings = companyId ? await prisma.settings.findFirst({
            where: { companyId }
        }) : null;
        const freshMeta = await this.getCompanyMetadata();
        const merged = { ...settings } as any;
        METADATA_FIELDS.forEach(field => {
            merged[field] = freshMeta[field] !== undefined ? freshMeta[field] : '';
        });
        return merged;
    }

    static async testDatabaseConnection(user: any, dependencies: any) {
        if (!['admin', 'manager'].includes(user.role)) {
            throw new Error('Forbidden');
        }

        await prisma.$queryRaw`SELECT 1`;

        const companyId = requestContext.getStore()?.companyId as string;
        const settings = companyId ? await prisma.settings.findFirst({
            where: { companyId }
        }) : null;

        await this.updateCompanyMetadata({
            lastDbTestStatus: 'success',
            lastDbTestDate: new Date(),
            lastDbTestError: null
        }, dependencies.clearCompanyCache);

        const freshMeta = await this.getCompanyMetadata();
        const merged = { ...settings } as any;
        METADATA_FIELDS.forEach(field => {
            merged[field] = freshMeta[field] !== undefined ? freshMeta[field] : '';
        });

        return merged;
    }

    static async logDatabaseTestFailure(user: any, errorMessage: string, body: any, dependencies: any) {
        const companyId = requestContext.getStore()?.companyId as string;
        let merged = { ...body };
        try {
            if (companyId) {
                const settings = await prisma.settings.findFirst({
                    where: { companyId }
                });

                await this.updateCompanyMetadata({
                    lastDbTestStatus: 'failure',
                    lastDbTestDate: new Date(),
                    lastDbTestError: errorMessage
                }, dependencies.clearCompanyCache);

                const freshMeta = await this.getCompanyMetadata();
                merged = { ...settings };
                METADATA_FIELDS.forEach(field => {
                    merged[field] = freshMeta[field] !== undefined ? freshMeta[field] : '';
                });
            }
        } catch (innerError) {
            console.error('Failed to log DB test error:', innerError);
        }
        return merged;
    }
}


