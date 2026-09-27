'use strict';

import { prisma } from '@workspace/db';
import { OneEightyUserProfile } from '@workspace/identity-client';

export interface CompanyResolutionResult {
    userId: string;
    hasCompany: boolean;
    companyId: string | null;
    companyName?: string;
    role?: string;
    requiresOnboarding: boolean;
    nextRoute: string;
}

export class CompanyResolver {
    /**
     * Resolves the enterprise tenant context for a verified 180 Identity user
     */
    static async resolveTenant(profile: OneEightyUserProfile): Promise<CompanyResolutionResult> {
        const user = await prisma.user.findUnique({
            where: { id: profile.id || profile.sub },
            include: {
                company: true,
            },
        });

        if (!user) {
            // New user without local DB sync
            return {
                userId: profile.id || profile.sub,
                hasCompany: false,
                companyId: null,
                requiresOnboarding: true,
                nextRoute: '/workspace-setup',
            };
        }

        if (user.companyId && user.company) {
            return {
                userId: user.id,
                hasCompany: true,
                companyId: user.companyId,
                companyName: user.company.name,
                role: user.role,
                requiresOnboarding: false,
                nextRoute: '/',
            };
        }

        return {
            userId: user.id,
            hasCompany: false,
            companyId: null,
            requiresOnboarding: true,
            nextRoute: '/workspace-setup',
        };
    }
}
