import { FeatureFlagRepository } from '../repositories/feature-flag.repository';
import { prisma } from '@workspace/db';

export interface PlatformAppFlagDefinition {
    name: string;
    appId: string;
    label: string;
    description: string;
    category: string;
    isEnabled: boolean;
}

export const LEGACY_FLAG_NAMES = [
    'enable_ai',
    'enable_chat',
    'enable_automation',
    'enable_google_drive',
    'enable_cloudinary',
    'enable_razorpay',
    'enable_mfa',
    'enable_support_tickets',
];

export const PLATFORM_APP_FLAGS: PlatformAppFlagDefinition[] = [
    {
        name: 'app_crm',
        appId: 'crm',
        label: 'CRM & Sales',
        description: 'Lead management, Pipeline, and Revenue tracking',
        category: 'Business',
        isEnabled: true
    },
    {
        name: 'app_traffic_director',
        appId: 'traffic-director',
        label: 'Traffic Director',
        description: 'Smart routing, dynamic landing page delivery, and differential traffic analytics',
        category: 'Marketing',
        isEnabled: true
    },
    {
        name: 'app_advertising',
        appId: 'advertising',
        label: 'Website Builder',
        description: 'Visual website editor, responsive landing page builder, and custom web publishing',
        category: 'Marketing',
        isEnabled: true
    },
    {
        name: 'app_projects',
        appId: 'projects',
        label: 'Projects & Tasks',
        description: 'Project management, Task boards, and Goal tracking',
        category: 'Productivity',
        isEnabled: true
    },
    {
        name: 'app_hr',
        appId: 'hr',
        label: 'Human Resources',
        description: 'Employee directory, Payroll, and Attendance',
        category: 'HR',
        isEnabled: true
    },
    {
        name: 'app_finance',
        appId: 'finance',
        label: 'Finance & Analytics',
        description: 'Invoicing, expenses, financial ledger, and platform-wide analytics & reports',
        category: 'Business',
        isEnabled: true
    },
    {
        name: 'app_communications',
        appId: 'communications',
        label: 'Communications',
        description: 'Active, real-time internal and external communication.',
        category: 'Communication',
        isEnabled: true
    },
    {
        name: 'app_workspace_tools',
        appId: 'workspace-tools',
        label: 'Workspace Tools',
        description: 'Passive knowledge, resource management, and utilities.',
        category: 'Productivity',
        isEnabled: true
    },
    {
        name: 'app_social_media',
        appId: 'social-media',
        label: 'Social Media Management',
        description: 'Content calendar, asset hub, unified inbox, AI brand voice, and social publishing suite',
        category: 'Marketing',
        isEnabled: true
    },
    {
        name: 'app_voiceforce',
        appId: 'voiceforce',
        label: '180 Voiceforce',
        description: 'Autonomous AI voice employees for customer calling, appointments, and order confirmation.',
        category: 'Operations',
        isEnabled: true
    },
    {
        name: 'app_media_editor',
        appId: 'media-editor',
        label: '180 Media Studio',
        description: 'Autonomous video production engine, AI creative director, and zero-drift smart timeline.',
        category: 'Productivity',
        isEnabled: true
    },
];

export class FeatureFlagService {
    /**
     * Purge legacy non-app flags and ensure all 11 platform apps are present
     */
    static async syncPlatformFlags() {
        try {
            // Delete legacy feature flags if present
            await prisma.featureFlag.deleteMany({
                where: {
                    name: { in: LEGACY_FLAG_NAMES }
                }
            });

            // Ensure all 11 platform apps exist
            const existingFlags = await FeatureFlagRepository.list();
            const existingMap = new Map(existingFlags.map(f => [f.name, f]));

            for (const appDef of PLATFORM_APP_FLAGS) {
                const existing = existingMap.get(appDef.name) as any;
                if (!existing) {
                    await FeatureFlagRepository.create({
                        name: appDef.name,
                        description: appDef.description,
                        isEnabled: appDef.isEnabled,
                        rules: {
                            appId: appDef.appId,
                            label: appDef.label,
                            category: appDef.category
                        }
                    });
                } else {
                    // Refresh label and description if changed
                    const existingRules = (existing.rules as any) || {};
                    if (existingRules.label !== appDef.label || existing.description !== appDef.description || existingRules.appId !== appDef.appId) {
                        await FeatureFlagRepository.update(existing.id, {
                            description: appDef.description,
                            rules: {
                                ...existingRules,
                                appId: appDef.appId,
                                label: appDef.label,
                                category: appDef.category
                            }
                        });
                    }
                }
            }
        } catch (err) {
            console.error('[FeatureFlagService.syncPlatformFlags] Error syncing flags:', err);
        }
    }

    static async list() {
        await this.syncPlatformFlags();
        return FeatureFlagRepository.list();
    }

    static async getAppFlags() {
        const flags = await this.list();
        const flagMap: Record<string, boolean> = {};
        const disabledApps: string[] = [];
        const enabledApps: string[] = [];

        for (const flag of flags) {
            flagMap[flag.name] = flag.isEnabled;
            
            // Map flag name (e.g. app_crm or crm) to appId
            const rules = (flag.rules as any) || {};
            const appId = rules.appId || flag.name.replace(/^app_/, '').replace(/_/g, '-');
            
            flagMap[appId] = flag.isEnabled;
            flagMap[`app_${appId.replace(/-/g, '_')}`] = flag.isEnabled;

            // Website Builder aliases (advertising <-> website-builder <-> ad-websites)
            if (appId === 'advertising' || appId === 'website-builder' || appId === 'ad-websites') {
                flagMap['advertising'] = flag.isEnabled;
                flagMap['app_advertising'] = flag.isEnabled;
                flagMap['website-builder'] = flag.isEnabled;
                flagMap['app_website_builder'] = flag.isEnabled;
                flagMap['ad-websites'] = flag.isEnabled;
                flagMap['app_ad_websites'] = flag.isEnabled;
            }

            if (!flag.isEnabled) {
                if (!disabledApps.includes(appId)) disabledApps.push(appId);
                if (appId === 'advertising') {
                    if (!disabledApps.includes('website-builder')) disabledApps.push('website-builder');
                    if (!disabledApps.includes('ad-websites')) disabledApps.push('ad-websites');
                }
            } else {
                if (!enabledApps.includes(appId)) enabledApps.push(appId);
                if (appId === 'advertising') {
                    if (!enabledApps.includes('website-builder')) enabledApps.push('website-builder');
                    if (!enabledApps.includes('ad-websites')) enabledApps.push('ad-websites');
                }
            }
        }

        return {
            flags: flagMap,
            disabledApps,
            enabledApps
        };
    }

    static async create(data: any, _adminId?: string) {
        const flagName = data.name || data.key;
        return await FeatureFlagRepository.create({
            name: flagName,
            description: data.description || null,
            isEnabled: data.isEnabled ?? true,
            rules: data.rules ?? undefined
        });
    }

    static async toggle(id: string, _adminId?: string) {
        const flag = await FeatureFlagRepository.findById(id);
        if (!flag) throw new Error('Flag not found');
        
        const updated = await FeatureFlagRepository.update(id, {
            isEnabled: !flag.isEnabled
        });

        return updated;
    }

    static async remove(id: string) {
        await FeatureFlagRepository.remove(id);
        return true;
    }
}
