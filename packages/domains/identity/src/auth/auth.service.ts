import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt, { JwtPayload } from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { authenticator } from 'otplib';
import qrcode from 'qrcode';
import { logAction, triggerAutomation, EmailService } from '@workspace/backend-infra';
import { BillingService, SubscriptionService } from '@workspace/platform-billing';
import { prisma as globalPrisma, getCompanyPrisma } from '@workspace/db';
import { AppError } from '../types/app-error';

// --- JWT Helpers ---

function signAccessToken(userId: string, companyId: string): string {
    const secret = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new Error('Server configuration error: missing JWT secret');
    return jwt.sign({ id: userId, companyId }, secret, {
        expiresIn: `${process.env.ACCESS_TOKEN_EXPIRE_MINUTES || 15}m`,
    } as jwt.SignOptions);
}

function signRefreshToken(userId: string, companyId: string): string {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) throw new Error('Server configuration error: missing JWT refresh secret');
    return jwt.sign({ id: userId, companyId }, secret, {
        expiresIn: `${process.env.REFRESH_TOKEN_EXPIRE_DAYS || 7}d`,
    } as jwt.SignOptions);
}

// --- Auth Service ---

export class AuthService {
    static async registerTenant(body: any) {
        const { name, email, password, companyName, logoBase64 } = body;
        
        const existingUser = await globalPrisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (existingUser && existingUser.companyId) {
            throw AppError.conflict('User already exists');
        }

        const company = await globalPrisma.company.create({
            data: {
                name: companyName,
                slug: `${companyName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
                databaseConfigured: true, 
                isOnboardingComplete: false,
                logoUrl: logoBase64 || null,
                subscriptionStatus: 'active',
                trialStartDate: null,
                trialEndDate: null,
            },
        });

        const hashedPassword = await bcrypt.hash(password, 10);

        let user;
        if (existingUser) {
            user = await globalPrisma.user.update({
                where: { id: existingUser.id },
                data: {
                    name,
                    password: hashedPassword,
                    companyId: company.id,
                    role: 'ceo',
                },
            });
        } else {
            user = await globalPrisma.user.create({
                data: {
                    name,
                    email: email.toLowerCase(),
                    password: hashedPassword,
                    role: 'ceo',
                    companyId: company.id,
                },
            });
        }
        
        return { user, company };
    }

    static async register(body: any, company: any, currentUser: any) {
        const companyPrisma = getCompanyPrisma(company.id);
        const { name, email, password, role, roles, department, designationId, position, permissions, employmentType, workLocation, managerId, phone, emergencyContact, salary, leaveBalance, joinDate, address } = body;

        if (!name || !email || !password) {
            throw AppError.badRequest('Name, email, and password are required');
        }

        const CompanyUser = companyPrisma.user;
        const exists = await CompanyUser.findFirst({ where: { email: email.toLowerCase() } });
        if (exists) {
            throw AppError.conflict('Email already registered in this workspace');
        }

        const globalAdmin = await globalPrisma.company.findFirst({ where: { adminEmail: email.toLowerCase() } });
        if (globalAdmin && globalAdmin.id !== company?.id) {
            throw AppError.forbidden('This email is registered as an administrator of another workspace and cannot be added to this one.');
        }

        const adminExists = await CompanyUser.findFirst({ where: { role: 'admin' }, select: { id: true } });
        let safeRoles = (roles && Array.isArray(roles)) ? roles : [(role || 'employee')];
        const validRoles = ['admin', 'manager', 'hr', 'employee', 'client'];
        safeRoles = [...new Set(safeRoles.filter((r: string) => validRoles.includes(r)))];
        if (safeRoles.length === 0) safeRoles = ['employee'];

        const isGrantingHigherPrivilage = safeRoles.some((r: string) => ['admin', 'hr'].includes(r));

        if (!adminExists) {
            safeRoles = ['admin'];
        } else if (isGrantingHigherPrivilage && !['admin', 'manager'].includes(currentUser?.role)) {
            safeRoles = ['employee'];
        }

        let employeeId = body.employeeId;
        if (!employeeId) {
            const count = await CompanyUser.count();
            employeeId = `EMP-${String(count + 1).padStart(4, '0')}`;
        }

        if (adminExists) {
            const limitCheck = await BillingService.enforceUserLimit(company?.id);
            if (!limitCheck.allowed) {
                throw new AppError(
                    `User limit reached for your ${limitCheck.plan} plan (${limitCheck.current}/${limitCheck.max}). Please upgrade.`,
                    403,
                    { limitReached: true }
                );
            }
        }

        const isSelfAdmin = company?.adminEmail === email.toLowerCase();

        let finalDesignationId = designationId;
        if (designationId) {
            const Designation = companyPrisma.designation;
            if (Designation) {
                let existing = await Designation.findFirst({
                    where: {
                        name: { equals: designationId, mode: 'insensitive' },
                        OR: [{ companyId: company?.id }, { companyId: null }]
                    }
                });
                if (!existing) {
                    existing = await Designation.create({
                        data: { name: designationId, isCustom: true, companyId: company?.id }
                    });
                }
                finalDesignationId = existing.id;
            }
        }

        let finalPassword = password;
        if (!isSelfAdmin && password) {
            const salt = await bcrypt.genSalt(10);
            finalPassword = await bcrypt.hash(password, salt);
        }

        const user = await CompanyUser.create({
            data: {
                name,
                email: email.toLowerCase(),
                password: isSelfAdmin ? undefined : finalPassword,
                role: safeRoles[0] || 'employee',
                employeeId,
                department,
                designationId: finalDesignationId || undefined,
                position,
                permissions: permissions || [],
                employmentType,
                workLocation,
                managerId: managerId || undefined,
                phone,
                emergencyContact,
                salary: salary ? parseFloat(salary) : undefined,
                leaveBalance: leaveBalance ? parseFloat(leaveBalance) : undefined,
                joinDate: joinDate ? new Date(joinDate) : undefined,
                address
            }
        });

        const token = signAccessToken(user.id, company.id);
        const refreshToken = signRefreshToken(user.id, company.id);

        triggerAutomation({
            eventType: 'user_onboarded',
            triggeredBy: currentUser?.id || user.id,
            targetUser: user.id,
            relatedItem: { itemId: user.id, itemModel: 'User' },
            description: `Welcome to the team, ${user.name}! Your account is ready.`,
            metadata: { hasTemporaryPassword: !!password },
            sendEmailNotification: false
        }, companyPrisma).catch((err: any) => console.error('[Auth] Automation error:', err));

        try {
            const isFirstAdmin = !adminExists && safeRoles.includes('admin');
            const category = isFirstAdmin ? EmailService.CATEGORIES.SYSTEM : EmailService.CATEGORIES.WORK;

            EmailService.notify(user, 'welcome', {
                password: password || 'No password assigned',
                category
            }, companyPrisma).catch((emailErr: any) => {
                console.error('[Auth] Failed to send welcome email:', emailErr.message);
            });
        } catch (emailErr: any) {
            console.error('[Auth] Failed to setup welcome email:', emailErr.message);
        }

        if (currentUser) {
            const Notification = companyPrisma.notification;
            const getIo = () => null as any;
            const Settings = companyPrisma.settings;
            const settings = await Settings.findFirst();
            const companyName = settings?.companyName || company?.companyName || 'Your Company';
            const subject = encodeURIComponent(`Welcome to ${companyName}`);
            const bodyStr = encodeURIComponent(`Hi ${user.name},\n\nYour account has been created.\nEmail: ${user.email}\nPassword: ${password}\n\nLogin at: ${process.env.CLIENT_URL}`);
            const actionUrl = `mailto:${user.email}?subject=${subject}&body=${bodyStr}`;

            const notification = await Notification.create({
                data: {
                    userId: currentUser.id,
                    type: 'email_pending',
                    title: 'Send Welcome Email',
                    message: `New user ${user.name} created. Click to send their credentials.`,
                    link: actionUrl,
                }
            });
            const io = getIo();
            if (io) {
                io.to(currentUser.id.toString()).emit('notification:new', {
                    _id: notification.id.toString(),
                    type: 'email_pending',
                    title: 'Send Welcome Email',
                    message: `New user ${user.name} created. Click to send their credentials.`,
                    link: actionUrl,
                    isRead: false,
                    createdAt: notification.createdAt
                });
            }
        }

        if (!adminExists && safeRoles.includes('admin')) {
            try {
                const ps = await globalPrisma.platformSettings.findFirst();
                const trialResult = await BillingService.createTrialSubscription(company.id, user.id);
                const trialDaysActive = trialResult.trialDays || ps?.trialDays || 14;
                const isForeverFree = trialResult.isForeverFree;
                
                const title = isForeverFree ? 'Welcome to 180workspace!' : 'Trial Evaluation Active';
                const message = isForeverFree 
                    ? `Welcome! You are currently on the free-forever Kickstart plan. Enjoy the platform.` 
                    : `Welcome! You are currently on a ${trialDaysActive}-day free trial plan. Enjoy the platform.`;

                await EmailService.notify(user, isForeverFree ? 'welcome_started' : 'trial_started', {
                    trialDays: trialDaysActive,
                    category: EmailService.CATEGORIES.SYSTEM
                }, companyPrisma);

                const Notification = companyPrisma.notification;
                const getIo = () => null as any;

                const trialNotification = await Notification.create({
                    data: {
                        userId: user.id,
                        type: 'system_alert',
                        title,
                        message,
                        link: '/dashboard/settings',
                    }
                });

                const io = getIo();
                if (io) {
                    io.to(user.id.toString()).emit('notification:new', {
                        _id: trialNotification.id.toString(),
                        type: 'system_alert',
                        title,
                        message,
                        link: '/dashboard/settings',
                        isRead: false,
                        createdAt: trialNotification.createdAt
                    });
                }
            } catch (billingErr: any) {
                console.error('[Auth] Trial creation/notification error:', billingErr.message);
            }
        }

        return { token, refreshToken, user };
    }

    static async findWorkspaces(email: string) {
        if (!email) {
            throw AppError.badRequest('Email is required');
        }

        const normalizedEmail = email.toLowerCase().trim();

        const users = await globalPrisma.user.findMany({
            where: { email: normalizedEmail },
            include: { company: true }
        });

        const adminCompanies = await globalPrisma.company.findMany({
            where: { adminEmail: normalizedEmail }
        });

        const companyMap = new Map<string, any>();
        for (const u of users) {
            if (u.company) companyMap.set(u.company.id, u.company);
        }
        for (const c of adminCompanies) {
            companyMap.set(c.id, c);
        }

        return Array.from(companyMap.values()).map((c: any) => ({
            name: c.companyName || c.name,
            slug: c.slug,
            logo: c.logoUrl,
            brandColor: c.brandColor,
            _id: c.id
        })).filter((w: any) => w.slug);
    }

    static async login(body: any, requestCompany: any) {
        const { email, password, mfaToken } = body;
        if (!email || !password) {
            throw AppError.badRequest('Email and password are required');
        }

        const normalizedEmail = email.toLowerCase().trim();
        let company = requestCompany || null;

        let user: any = null;
        if (company) {
            user = await globalPrisma.user.findFirst({
                where: { email: normalizedEmail, companyId: company.id },
                include: { company: true }
            });
        } else {
            user = await globalPrisma.user.findFirst({
                where: { email: normalizedEmail },
                include: { company: true }
            });
            if (user && user.company) {
                company = user.company;
            }
        }

        if (!company) {
            company = await globalPrisma.company.findFirst({
                where: { adminEmail: normalizedEmail }
            });
        }

        if (!company) {
            throw AppError.unauthorized("We couldn't find an account linked to this email. Please sign up to create a new workspace.");
        }

        if (!company.isOnboardingComplete) {
            let onboardingToken = (company.metadata as any)?.onboardingToken;
            let currentMetadata = company.metadata || {};
            if (typeof currentMetadata === 'string') {
                try { currentMetadata = JSON.parse(currentMetadata); } catch (e) { currentMetadata = {}; }
            }
            company = await globalPrisma.company.update({
                where: { id: company.id },
                data: { metadata: { ...(currentMetadata as any), onboardingToken } }
            });
            throw new AppError('Your workspace requires setup. Redirecting to onboarding...', 403, {
                onboardingRequired: true,
                onboardingToken,
                company
            });
        }

        if (company.isSuspended) {
            throw AppError.forbidden(`Your workspace has been suspended: ${company.suspendedReason}. Please contact billing support.`);
        }

        const isPrimaryAdmin = company.adminEmail && company.adminEmail.toLowerCase() === normalizedEmail;
        let isMatch = false;

        if (isPrimaryAdmin && (!user || company.adminPasswordHash)) {
            if (!company.adminPasswordHash) {
                const fullCompany = await globalPrisma.company.findUnique({ where: { id: company.id } });
                if (fullCompany) {
                    company.adminPasswordHash = fullCompany.adminPasswordHash;
                }
            }

            if (company.adminPasswordHash) {
                isMatch = await bcrypt.compare(password, company.adminPasswordHash || '');
            } else if (user) {
                isMatch = await bcrypt.compare(password, user.passwordHash || user.password || '');
            }

            if (!isMatch) {
                throw AppError.unauthorized('Incorrect email or password. Please try again.');
            }

            if (!user) {
                user = await globalPrisma.user.findFirst({
                    where: { email: normalizedEmail, companyId: company.id }
                });
                if (!user) {
                    user = await globalPrisma.user.create({
                        data: {
                            name: company.adminName || 'Workspace Admin',
                            email: normalizedEmail,
                            companyId: company.id,
                            role: 'admin',
                            isActive: true
                        }
                    });
                }
            }
        } else {
            if (!user) {
                user = await globalPrisma.user.findFirst({
                    where: { email: normalizedEmail, companyId: company.id }
                });
            }
            if (!user) {
                throw AppError.unauthorized('Incorrect email or password. Please try again.');
            }
            try {
                isMatch = await bcrypt.compare(password, user.passwordHash || user.password || '');
            } catch (bcryptErr) {
                isMatch = false;
            }
            if (!isMatch) {
                throw AppError.unauthorized('Incorrect email or password. Please try again.');
            }
        }

        if (!user.isActive) {
            throw AppError.unauthorized('Your account has been deactivated. Please contact your workspace administrator.');
        }

        if (user.mfaEnabled) {
            if (!mfaToken) {
                throw new AppError('MFA Required', 200, { mfaRequired: true, userId: user.id });
            }
            const valid = authenticator.check(mfaToken, user.mfaSecret);
            if (!valid) {
                throw AppError.unauthorized('The MFA code you entered is invalid. Please try again.');
            }
        }

        const accessToken = signAccessToken(user.id, company.id);
        const refreshToken = signRefreshToken(user.id, company.id);

        return { accessToken, refreshToken, user, company };
    }

    static async refreshToken(refreshTokenStr: string) {
        if (!refreshTokenStr) {
            throw AppError.badRequest('Refresh token required');
        }

        let decoded: JwtPayload;
        try {
            decoded = jwt.verify(refreshTokenStr, process.env.JWT_REFRESH_SECRET!) as JwtPayload;
        } catch {
            throw AppError.unauthorized('Invalid or expired refresh token');
        }

        const companyId = decoded.companyId;
        if (!companyId) {
            throw AppError.badRequest('Invalid token structure. Missing company binding.');
        }

        const company = await globalPrisma.company.findUnique({ where: { id: companyId } });
        if (!company) {
            throw AppError.unauthorized('Associated company not found');
        }

        const companyPrisma = getCompanyPrisma(company.id);
        const user = await companyPrisma.user.findUnique({ where: { id: decoded.id } });

        if (!user) {
            throw AppError.unauthorized('User not found');
        }

        const newAccessToken = signAccessToken(user.id, company.id);
        return { token: newAccessToken, user, company };
    }

    static async getMe(userObj: any, companyIdInput: string) {
        let company = null;
        if (companyIdInput) {
            company = await globalPrisma.company.findUnique({ where: { id: companyIdInput } });
        }
        return { user: userObj, company, isModuleLead: false };
    }

    static async changePassword(body: any, currentUser: any, companyObj: any) {
        const companyPrisma = getCompanyPrisma(companyObj.id);
        const { currentPassword, newPassword } = body;
        if (!currentPassword || !newPassword) {
            throw AppError.badRequest('Both current and new password are required');
        }

        const isPrimaryAdmin = companyObj?.adminEmail === currentUser.email;
        const user = await companyPrisma.user.findUnique({ where: { id: currentUser.id } });

        if (isPrimaryAdmin) {
            const company = await globalPrisma.company.findUnique({ where: { id: companyObj.id } });
            if (!company) {
                throw AppError.notFound('Company not found');
            }

            const ok = await bcrypt.compare(currentPassword, company.adminPasswordHash || '');
            if (!ok) {
                throw AppError.unauthorized('Current password is incorrect');
            }

            const salt = await bcrypt.genSalt(12);
            const newPasswordHash = await bcrypt.hash(newPassword, salt);

            await globalPrisma.company.update({ where: { id: companyObj.id }, data: { adminPasswordHash: newPasswordHash } });

            if (user.passwordHash || user.password) {
                await companyPrisma.user.update({ where: { id: user.id }, data: { passwordHash: null, password: null } });
            }
        } else {
            const ok = await bcrypt.compare(currentPassword, user.passwordHash || user.password || '');
            if (!ok) {
                throw AppError.unauthorized('Current password is incorrect');
            }

            const salt = await bcrypt.genSalt(12);
            const newPasswordHash = await bcrypt.hash(newPassword, salt);
            await companyPrisma.user.update({ where: { id: user.id }, data: { passwordHash: newPasswordHash, password: null } });
        }

        return user;
    }

    static async setupMFA(currentUser: any, companyObj: any) {
        const companyPrisma = getCompanyPrisma(companyObj.id);
        const settings = await companyPrisma.settings.findFirst();
        const companyName = settings?.companyName || companyObj?.companyName || 'Your Company';
        const secret = authenticator.generateSecret();
        const uri = authenticator.keyuri(currentUser.email, companyName, secret);
        const qrCode = await qrcode.toDataURL(uri);
        return { secret, qrCode, provisioningUri: uri };
    }

    static async enableMFA(body: any, currentUser: any) {
        const companyPrisma = getCompanyPrisma(currentUser.companyId);
        const { secret, token } = body;
        if (!authenticator.check(token, secret)) {
            throw AppError.badRequest('Invalid MFA token');
        }
        await companyPrisma.user.update({ where: { id: currentUser.id }, data: { mfaEnabled: true, mfaSecret: secret } });
        return { message: 'MFA enabled successfully' };
    }

    static async completeWorkspaceSetup(body: any, onboardingTokenHeader: string, currentUser: any, reqCompany: any) {
        const { 
            companyName, slug, website, oneLineDescription, 
            industry, startupStage, teamSize, 
            enabledApps, enabledModules, 
            currency, currencySymbol, country,
            logoUrl, planId, couponCode
        } = body;
        let user = currentUser;
        let companyId = reqCompany?.id;
        const companyPrisma = getCompanyPrisma(companyId);

        if (!user && onboardingTokenHeader) {
            if (!reqCompany || (reqCompany.metadata as any)?.onboardingToken !== onboardingTokenHeader) {
                throw AppError.forbidden('Invalid or expired onboarding token');
            }
            user = await companyPrisma.user.findFirst({ where: { role: 'admin' } });
            companyId = reqCompany.id;
        }

        if (!user) {
            throw AppError.unauthorized('Authentication required to complete setup');
        }

        let config = await companyPrisma.companyConfig.findFirst();
        if (!config) {
            config = await companyPrisma.companyConfig.create({
                data: {}
            });
        }

        const updatedUser = await companyPrisma.user.findUnique({ where: { id: user.id } });
        if (!updatedUser) {
            throw AppError.notFound('Admin user not found in workspace');
        }

        const company = await globalPrisma.company.findUnique({ where: { id: companyId } });
        let metadata: any = company?.metadata || {};
        if (typeof metadata === 'string') { try { metadata = JSON.parse(metadata); } catch (e) { metadata = {}; } }
        metadata.onboardingToken = null;
        if (enabledApps) metadata.enabledApps = enabledApps;
        if (enabledModules) metadata.enabledModules = enabledModules;

        const resolvedCompanyType = industry || config?.companyType || undefined;

        await globalPrisma.company.update({
            where: { id: companyId }, data: {
                isOnboardingComplete: true,
                ...(companyName && { name: companyName }),
                ...(slug && { slug }),
                ...(website && { website }),
                ...(oneLineDescription && { oneLineDescription }),
                ...(industry && { industry }),
                ...(startupStage && { startupStage }),
                ...(teamSize && { teamSize }),
                ...(country && { country }),
                ...(currency && { currency }),
                ...(currencySymbol && { currencySymbol }),
                ...(logoUrl && { logoUrl }),
                metadata
            }
        });

        if (planId) {
            try {
                const plan = await globalPrisma.plan.findUnique({ where: { id: planId } });
                
                if (plan && plan.price > 0) {
                    // Paid plan, start a frictionless trial
                    const { SubscriptionService } = require('@workspace/platform-billing');
                    const subscriptionService = new SubscriptionService();
                    await subscriptionService.startFrictionlessTrial(planId, companyId, couponCode || 'FREETRIAL14');
                }
            } catch (err) {
                console.error('Failed to start subscription:', err);
                // Non-blocking for setup
            }
        } else {
            // Assign default free Kickstart plan
            try {
                const freePlan = await globalPrisma.plan.findFirst({
                    where: { price: 0, isActive: true },
                    orderBy: { price: 'asc' }
                });
                
                if (freePlan) {
                    await globalPrisma.subscription.create({
                        data: {
                            companyId: companyId,
                            planId: freePlan.id,
                            status: 'ACTIVE',
                            provider: 'system',
                            currency: 'USD',
                            mandateStatus: 'COMPLETED',
                            mandateAmount: 0,
                            amount: 0
                        }
                    });
                }
            } catch (err) {
                console.error('Failed to assign default Kickstart plan:', err);
            }
        }

        // Redis cache invalidation (optional — only if redis is available)
        try {
            const Redis = await import('ioredis').catch(() => null);
            if (Redis && process.env.REDIS_URL) {
                const redisClient = new Redis.default(process.env.REDIS_URL);
                await redisClient.del(`company:${companyId.toString()}`);
                await redisClient.del(`init:user:${user.id}:company:${companyId.toString()}`);
                await redisClient.quit();
            }
        } catch (err) { /* Redis not available, skip cache invalidation */ }

        const accessToken = signAccessToken(updatedUser.id, companyId);
        const refreshToken = signRefreshToken(updatedUser.id, companyId);

        const hashed = await bcrypt.hash(refreshToken, 8);
        // User refreshTokens are not in schema currently, skip updating it.

        try {
            const ps = await globalPrisma.platformSettings.findFirst();
            const loginUrl = ps?.platformApiUrl || process.env.CLIENT_URL || '';
            await EmailService.notify(updatedUser, 'company_welcome', { loginUrl }, companyPrisma);
        } catch (emailErr) { /* Email failure should not block setup completion */ }

        return { token: accessToken, refreshToken, user: updatedUser, config, companyId, companyType: resolvedCompanyType, teamSize, enabledApps };
    }

    static async forgotPassword(body: any, reqCompany: any) {
        const { email } = body;
        if (!email) {
            throw AppError.badRequest('Email is required');
        }

        const normalizedEmail = email.toLowerCase().trim();
        let company = reqCompany || null;
        let user: any = null;

        if (company) {
            user = await globalPrisma.user.findFirst({
                where: { email: normalizedEmail, companyId: company.id }
            });
        } else {
            user = await globalPrisma.user.findFirst({
                where: { email: normalizedEmail },
                include: { company: true }
            });
            if (user && user.company) {
                company = user.company;
            }
        }

        if (!company) {
            company = await globalPrisma.company.findFirst({
                where: { adminEmail: normalizedEmail }
            });
        }

        if (!company) return { user: null };

        if (!user) {
            user = await globalPrisma.user.findFirst({
                where: { email: normalizedEmail, companyId: company.id }
            });
        }

        const isPrimaryAdmin = company.adminEmail && company.adminEmail.toLowerCase() === normalizedEmail;
        const userRole = user?.role || (isPrimaryAdmin ? 'admin' : 'employee');
        const adminRoles = ['admin', 'manager'];
        if (!adminRoles.includes(userRole) && !isPrimaryAdmin) {
            throw AppError.forbidden('Password reset via email is only available for admin and manager accounts. Please contact your administrator.');
        }
        const tempPassword = crypto.randomBytes(5).toString('hex');

        if (isPrimaryAdmin) {
            const salt = await bcrypt.genSalt(12);
            const hashedTemp = await bcrypt.hash(tempPassword, salt);
            await globalPrisma.company.update({ where: { id: company.id }, data: { adminPasswordHash: hashedTemp } });

            if (user && (user.passwordHash || user.password)) {
                await globalPrisma.user.update({ where: { id: user.id }, data: { password: null } });
            }
        } else if (user) {
            const salt = await bcrypt.genSalt(10);
            const hashedTemp = await bcrypt.hash(tempPassword, salt);
            await globalPrisma.user.update({ where: { id: user.id }, data: { password: hashedTemp } });
        }

        try {
            const companyName = company.companyName || company.name || 'Your Company';
            await EmailService.sendForgotPasswordEmail(user || { email: normalizedEmail, name: company.adminName || 'Admin' }, tempPassword, companyName, globalPrisma);
        } catch (emailErr) { /* Email failure should not block password reset flow */ }

        return { user: user || { email: normalizedEmail } };
    }

    static async checkForgotEligibility(query: any) {
        const email = (query.email || '').toLowerCase().trim();
        if (!email) return false;

        const user = await globalPrisma.user.findFirst({
            where: { email }
        });
        if (user) {
            const userRole = user.role || 'employee';
            return ['admin', 'manager'].includes(userRole);
        }

        const company = await globalPrisma.company.findFirst({
            where: { adminEmail: email }
        });
        return !!company;
    }

    static async googleLogin(body: any) {
        const { tokenId } = body;
        if (!tokenId) {
            throw AppError.badRequest('Google tokenId is required');
        }

        const clientId = (process.env.GOOGLE_CLIENT_ID || '').replace(/"/g, '').replace(/'/g, '').trim();
        const client = new OAuth2Client(clientId);

        let ticket;
        try {
            ticket = await client.verifyIdToken({
                idToken: tokenId,
                audience: clientId,
            });
        } catch (error: any) {
            const decoded = jwt.decode(tokenId) as JwtPayload | null;
            console.error('[GoogleLogin] verifyIdToken error:', error.message);
            console.error('[GoogleLogin] Expected Audience:', clientId);
            console.error('[GoogleLogin] Actual Token Audience:', decoded?.aud);

            throw AppError.unauthorized('Google authentication failed. Please try again.');
        }

        const payload = ticket.getPayload() as TokenPayload;
        const email = payload.email!.toLowerCase();

        let user = await globalPrisma.user.findFirst({
            where: { email },
            include: { company: true }
        });

        let company = user?.company || null;

        if (!company) {
            company = await globalPrisma.company.findFirst({
                where: { adminEmail: email }
            });
        }

        if (!company) {
            throw AppError.notFound("We couldn't find an account linked to this email. Please sign up to create a new workspace.");
        }

        if (!user) {
            user = await globalPrisma.user.create({
                data: {
                    name: payload.name || company.adminName || 'Workspace Admin',
                    email,
                    companyId: company.id,
                    role: 'admin',
                    photoUrl: payload.picture,
                    googleId: payload.sub,
                    isActive: true
                },
                include: { company: true }
            });
        } else {
            const updateData: any = {};
            if (payload.picture && !user.photoUrl) {
                updateData.photoUrl = payload.picture;
            }
            if (!user.googleId) {
                updateData.googleId = payload.sub;
            }
            if (Object.keys(updateData).length > 0) {
                user = await globalPrisma.user.update({
                    where: { id: user.id },
                    data: updateData,
                    include: { company: true }
                });
            }
        }

        if (!user.isActive) {
            throw AppError.forbidden('Your account has been deactivated.');
        }

        const token = signAccessToken(user.id, company.id);
        const refreshToken = signRefreshToken(user.id, company.id);

        return { token, refreshToken, user, company };
    }

    static async sendOtp(email: string) {
        const normalizedEmail = email.toLowerCase().trim();
        
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date();
        otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);
        
        let user = await globalPrisma.user.findUnique({ where: { email: normalizedEmail } });
        
        if (user) {
            if (user.username || user.companyId) {
                throw new AppError('Please sign in, you are already registered in our platform.', 409, { code: 'USER_EXISTS' });
            }
            await globalPrisma.user.update({
                where: { email: normalizedEmail },
                data: { otpCode, otpExpiry },
            });
        } else {
            user = await globalPrisma.user.create({
                data: {
                    name: "New User",
                    email: normalizedEmail,
                    otpCode,
                    otpExpiry,
                },
            });
        }
        
        return { otpCode };
    }

    static async sendOtpEmail(email: string, otpCode: string) {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_FROM || '"180Workspace Auth" <noreply@180workspace.com>',
            to: email,
            subject: "Your PitchIn Verification Code",
            html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>Welcome to PitchIn!</h2>
                    <p>Your verification code is: <strong>${otpCode}</strong></p>
                    <p>This code will expire in 10 minutes.</p>
                   </div>`,
        };

        if (process.env.SMTP_HOST && process.env.SMTP_USER) {
            await transporter.sendMail(mailOptions);
        } else {
            console.log(`[Development Mode] OTP for ${email} is ${otpCode}`);
        }
    }

    static async verifyOtp(email: string, otp: string) {
        const normalizedEmail = email.toLowerCase().trim();
        
        const user = await globalPrisma.user.findUnique({ where: { email: normalizedEmail } });
        if (!user) {
            throw AppError.notFound('User not found');
        }

        if (user.otpCode !== otp || !user.otpExpiry || user.otpExpiry < new Date()) {
            throw AppError.badRequest('Invalid or expired OTP');
        }

        await globalPrisma.user.update({
            where: { email: normalizedEmail },
            data: { otpCode: null, otpExpiry: null, emailVerified: new Date() },
        });
        
        return true;
    }

    static async onboarding(email: string, data: any) {
        const { role, name, username, headline, title, city, country, socialLinks, bio, interests, imageBase64 } = data;
        
        if (username) {
            const existingUser = await globalPrisma.user.findFirst({
                where: { 
                    username, 
                    email: { not: email } 
                }
            });
            if (existingUser) {
                throw new AppError('Username is already taken', 409, { code: 'USERNAME_TAKEN' });
            }
        }

        const user = await globalPrisma.user.update({
            where: { email },
            data: {
                ...(name && { name }),
                ...(role && { role }),
                ...(username && { username }),
                ...(headline && { headline }),
                ...(title && { title }),
                ...(city && { city }),
                ...(country && { country }),
                ...(socialLinks && { socialLinks }),
                ...(bio && { bio }),
                ...(interests && { interests }),
                ...(imageBase64 && { photoUrl: imageBase64 })
            },
        });


        return user;
    }

    static async checkUsername(username: string) {
        const user = await globalPrisma.user.findFirst({
            where: { username }
        });
        return !user;
    }
}

