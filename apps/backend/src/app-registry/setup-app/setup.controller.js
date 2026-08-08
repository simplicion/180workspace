'use strict';

const { prisma } = require('@workspace/db');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { uploadToCloudinary } = require('../../system-configs/config/cloudinary.js');
const { OAuth2Client } = require('google-auth-library');

exports.getSetupStatus = async (req, res) => {
    try {
        const adminExists = await prisma.user.findFirst({
            where: { role: 'admin' },
            select: { id: true }
        });

        res.status(200).json({
            success: true,
            isConfigured: true,
            adminExists: !!adminExists
        });
    } catch (err) {
        res.status(200).json({
            success: true,
            isConfigured: true,
            adminExists: false
        });
    }
};

// --- Multi-Company Setup Methods ---

exports.registerCompany = async (req, res) => {
    try {
        const { companyName, adminName, adminEmail, adminPassword } = req.body;

        if (!companyName || !adminName || !adminEmail || !adminPassword) {
            return res.status(400).json({ success: false, error: 'All fields (companyName, adminName, adminEmail, adminPassword) are required.' });
        }

        // Check company name uniqueness (case-insensitive)
        const existingCompanyWithName = await prisma.company.findFirst({
            where: { name: { equals: companyName.trim(), mode: 'insensitive' } }
        });
        if (existingCompanyWithName) {
            return res.status(409).json({ success: false, error: 'A company with this name is already registered.' });
        }

        // Check if admin email already exists globally
        const existingCompany = await prisma.company.findFirst({
            where: { adminEmail: adminEmail.toLowerCase() }
        });
        if (existingCompany) {
            return res.status(409).json({ success: false, error: 'A company is already registered with this admin email. Each admin can only own one workspace.' });
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

        const adminPasswordHash = await bcrypt.hash(adminPassword, 12);

        // Handle Optional logo upload
        let logoUrl = null;
        if (req.file) {
            try {
                const cloudResult = await uploadToCloudinary(req.file.buffer, {
                    folder: 'ims/logos',
                    resourceType: 'image'
                });
                logoUrl = cloudResult.secure_url;
            } catch (err) {
                console.error('[Register Company] Logo upload failed:', err.message);
            }
        }

        // Generate a temporary setup & onboarding token
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
                emailFrom: 'noreply@internal.system',
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

        res.status(201).json({
            success: true,
            message: 'Company registered successfully.',
            setupToken,
            onboardingToken,
            companyId: newCompany.id,
            slug
        });

    } catch (err) {
        console.error('Register Company Error:', err);
        res.status(500).json({ success: false, error: 'Failed to register company.' });
    }
};

exports.registerCompanyGoogle = async (req, res) => {
    try {
        const { companyName, adminName, tokenId } = req.body;

        if (!companyName || !adminName || !tokenId) {
            return res.status(400).json({ success: false, error: 'Company Name, Admin Name, and Google Token are required.' });
        }

        // Verify Google token
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        let payload;
        try {
            const ticket = await client.verifyIdToken({
                idToken: tokenId,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
            payload = ticket.getPayload();
        } catch (err) {
            return res.status(401).json({ success: false, error: 'Invalid Google token' });
        }

        const adminEmail = payload.email;

        // Check company name uniqueness (case-insensitive)
        const existingCompanyWithName = await prisma.company.findFirst({
            where: { name: { equals: companyName.trim(), mode: 'insensitive' } }
        });
        if (existingCompanyWithName) {
            return res.status(409).json({ success: false, error: 'A company with this name is already registered.' });
        }

        // Check if admin email already exists globally
        const existingCompany = await prisma.company.findFirst({
            where: { adminEmail: adminEmail.toLowerCase() }
        });
        if (existingCompany) {
            return res.status(409).json({ success: false, error: 'A company is already registered with this admin email. Each admin can only own one workspace.' });
        }

        // Auto-generate a URL-safe slug from companyName
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

        // Generate a random password since Google Auth is used
        const randomPassword = crypto.randomBytes(16).toString('hex');
        const adminPasswordHash = await bcrypt.hash(randomPassword, 12);

        // Handle Optional logo upload
        let logoUrl = null;
        if (req.file) {
            try {
                const cloudResult = await uploadToCloudinary(req.file.buffer, {
                    folder: 'ims/logos',
                    resourceType: 'image'
                });
                logoUrl = cloudResult.secure_url;
            } catch (err) {
                console.error('[Register Company Google] Logo upload failed:', err.message);
            }
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
                emailFrom: 'noreply@internal.system',
                storageMode: 'cloudinary'
            }
        }).catch(err => console.warn('[Register Google] Settings seed error:', err.message));

        // Seed Default App Configuration for Company
        await prisma.companyConfig.create({
            data: {
                companyId: newCompany.id
            }
        }).catch(err => console.warn('[Register Google] CompanyConfig seed error:', err.message));

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
        }).catch(err => console.warn('[Register Google] Admin User seed error:', err.message));

        res.status(201).json({
            success: true,
            message: 'Company registered successfully.',
            setupToken,
            onboardingToken,
            companyId: newCompany.id,
            slug
        });

    } catch (err) {
        console.error('Register Company Google Error:', err);
        res.status(500).json({ success: false, error: 'Failed to register company.' });
    }
};

exports.configureCompany = async (req, res) => {
    try {
        const { setupToken } = req.body;

        if (!setupToken) {
            return res.status(400).json({ success: false, error: 'Setup token is required' });
        }

        // Find company by setupToken in JSON metadata
        const companies = await prisma.company.findMany();
        const company = companies.find(c => {
            const meta = c.metadata || {};
            return meta.setupToken === setupToken;
        });

        if (!company) {
            return res.status(404).json({ success: false, error: 'Invalid or expired setup token' });
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
                    emailFrom: 'noreply@internal.system',
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
                    ...(company.metadata || {}),
                    onboardingToken,
                    setupToken: null
                }
            }
        });

        res.status(200).json({
            success: true,
            message: 'Database configured and seeded successfully. Application is ready.',
            onboardingToken: onboardingToken
        });

    } catch (err) {
        console.error('Configure Company Error:', err);
        res.status(500).json({ success: false, error: err.message || 'Failed to configure company.' });
    }
};

// Legacy method for standalone deployment (noop)
exports.configureDatabase = async (req, res, next) => {
    res.status(200).json({
        success: true,
        message: 'Legacy database setup bypassed.'
    });
};
