import { prisma } from '@workspace/db';
import crypto from 'crypto';

export class SetupService {
    static async getSetupStatus() {
        const adminExists = await prisma.user.findFirst({
            where: { role: 'admin' },
            select: { id: true }
        });

        return {
            success: true,
            isConfigured: true,
            adminExists: !!adminExists
        };
    }

    static async registerCompany({ companyName, adminName, adminEmail, adminPasswordHash, logoUrl }: { companyName: string, adminName: string, adminEmail: string, adminPasswordHash: string, logoUrl: string | null }) {
        // Check company name uniqueness (case-insensitive)
        const existingCompanyWithName = await prisma.company.findFirst({
            where: { name: { equals: companyName.trim(), mode: 'insensitive' } }
        });
        if (existingCompanyWithName) {
            throw new Error('A company with this name is already registered.');
        }

        // Check if admin email already exists globally
        const existingCompany = await prisma.company.findFirst({
            where: { adminEmail: adminEmail.toLowerCase() }
        });
        if (existingCompany) {
            throw new Error('A company is already registered with this admin email. Each admin can only own one workspace.');
        }

        // Generate a URL-safe slug from companyName
        const baseSlug = companyName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .slice(0, 30);

        let slug = baseSlug;
        let suffix = 1;
        while (await prisma.company.findUnique({ where: { slug } })) {
            slug = `${baseSlug}${suffix}`;
            suffix++;
        }

        if (!slug) {
            slug = `workspace${Date.now().toString().slice(-6)}`;
        }

        const setupToken = crypto.randomBytes(32).toString('hex');
        const onboardingToken = crypto.randomBytes(32).toString('hex');

        // Create the company
        const newCompany = await prisma.company.create({
            data: {
                name: companyName,
                adminName,
                adminEmail: adminEmail.toLowerCase(),
                adminPasswordHash,
                databaseConfigured: true,
                isOnboardingComplete: false,
                subscriptionStatus: 'trial',
                trialStartDate: new Date(),
                trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
                slug,
                logoUrl,
                metadata: { setupToken, onboardingToken },
                accountStatus: 'active'
            }
        });

        // Seed default settings for company
        await prisma.settings.create({
            data: {
                companyId: newCompany.id,
                companyName: newCompany.name,
                logoUrl: newCompany.logoUrl || null,
                themeColor: '#4f46e5',
                storageMode: 'cloudinary'
            }
        }).catch(err => console.warn('[Register] Settings seed error:', err.message));

        // Seed Default App Configuration for Company
        await prisma.companyConfig.create({
            data: {
                companyId: newCompany.id
            }
        }).catch(err => console.warn('[Register] CompanyConfig seed error:', err.message));

        // Seed the Admin User into the User table
        await prisma.user.create({
            data: {
                name: newCompany.adminName,
                email: newCompany.adminEmail.toLowerCase(),
                password: newCompany.adminPasswordHash,
                role: 'admin',
                isActive: true,
                isFirstLogin: true,
                companyId: newCompany.id
            }
        }).catch(err => console.warn('[Register] Admin User seed error:', err.message));

        return {
            success: true,
            message: 'Company registered successfully.',
            setupToken,
            onboardingToken,
            companyId: newCompany.id,
            slug
        };
    }

    static async configureCompany(setupToken: string) {
        // Find company by setupToken in JSON metadata
        const companies = await prisma.company.findMany();
        const company = companies.find((c: any) => {
            const meta = c.metadata || {};
            return meta.setupToken === setupToken;
        });

        if (!company) {
            throw new Error('Invalid or expired setup token');
        }

        // Seed default settings for company
        const existingSettings = await prisma.settings.findFirst({
            where: { companyId: company.id }
        });
        if (!existingSettings) {
            await prisma.settings.create({
                data: {
                    companyId: company.id,
                    companyName: company.name,
                    logoUrl: company.logoUrl || null,
                    themeColor: '#4f46e5',
                    storageMode: 'cloudinary'
                }
            });
        }

        // Seed Default App Configuration for Company
        const existingConfig = await prisma.companyConfig.findUnique({
            where: { companyId: company.id }
        });
        if (!existingConfig) {
            await prisma.companyConfig.create({
                data: {
                    companyId: company.id
                }
            });
        }

        // Seed the Admin User into the User table
        let adminUser = await prisma.user.findUnique({
            where: { email: company.adminEmail.toLowerCase() }
        });

        if (!adminUser) {
            adminUser = await prisma.user.create({
                data: {
                    name: company.adminName,
                    email: company.adminEmail.toLowerCase(),
                    password: company.adminPasswordHash,
                    role: 'admin',
                    isActive: true,
                    isFirstLogin: true,
                    companyId: company.id
                }
            });
        } else {
            await prisma.user.update({
                where: { id: adminUser.id },
                data: {
                    companyId: company.id,
                    role: 'admin',
                    isActive: true
                }
            });
        }

        // Update Company status
        const onboardingToken = crypto.randomBytes(32).toString('hex');
        await prisma.company.update({
            where: { id: company.id },
            data: {
                databaseConfigured: true,
                metadata: {
                    ...(company.metadata as object || {}),
                    onboardingToken,
                    setupToken: null
                }
            }
        });

        return {
            success: true,
            message: 'Database configured and seeded successfully. Application is ready.',
            onboardingToken: onboardingToken
        };
    }
}

