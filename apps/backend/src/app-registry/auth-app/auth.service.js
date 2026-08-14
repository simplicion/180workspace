'use strict';

const { logAction } = require('../../system-configs/middleware/audit/audit.js');
const { signAccessToken, signRefreshToken } = require('../../system-configs/middleware/auth/auth.js');
const { totp } = require('otplib');
const qrcode = require('qrcode');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const BillingService = require('../finance-app/bills/billing.service');
const EmailService = require('../productivity-tools-app/emails/email.service');
const { prisma: globalPrisma, getCompanyPrisma } = require('@workspace/db');

class AuthService {
    static async registerTenant(body) {
        const { name, email, password, companyName, logoBase64 } = body;
        
        // Check if user already exists
        const existingUser = await globalPrisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (existingUser && existingUser.companyId) {
            const err = new Error('User already exists');
            err.status = 409; throw err;
        }

        // Create company
        const company = await globalPrisma.company.create({
            data: {
                name: companyName,
                slug: `${companyName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
                databaseConfigured: true, 
                isOnboardingComplete: false,
                logoUrl: logoBase64 || null,
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

    static async register(companyPrisma, body, company, currentUser) {
        const { name, email, password, role, roles, department, designationId, position, permissions, employmentType, workLocation, managerId, phone, emergencyContact, salary, leaveBalance, joinDate, address } = body;

        if (!name || !email || !password) {
            const err = new Error('Name, email, and password are required');
            err.status = 400; throw err;
        }

        const CompanyUser = companyPrisma.user;
        const exists = await CompanyUser.findFirst({ where: { email: email.toLowerCase() } });
        if (exists) {
            const err = new Error('Email already registered in this workspace');
            err.status = 409; throw err;
        }

        const globalAdmin = await globalPrisma.company.findFirst({ where: { adminEmail: email.toLowerCase() } });
        if (globalAdmin && globalAdmin.id !== company?.id) {
            const err = new Error('This email is registered as an administrator of another workspace and cannot be added to this one.');
            err.status = 403; throw err;
        }

        const adminExists = await CompanyUser.findFirst({ where: { role: 'admin' }, select: { id: true } });
        let safeRoles = (roles && Array.isArray(roles)) ? roles : [(role || 'employee')];
        const validRoles = ['admin', 'manager', 'hr', 'employee', 'client'];
        safeRoles = [...new Set(safeRoles.filter(r => validRoles.includes(r)))];
        if (safeRoles.length === 0) safeRoles = ['employee'];

        const isGrantingHigherPrivilage = safeRoles.some(r => ['admin', 'hr'].includes(r));

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
                const err = new Error(`User limit reached for your ${limitCheck.plan} plan (${limitCheck.current}/${limitCheck.max}). Please upgrade.`);
                err.status = 403; err.limitReached = true; throw err;
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

        const AutomationService = require('../../platform-core/platform-communications/services/automation.service.js');
        AutomationService.trigger({
            eventType: 'user_onboarded',
            triggeredBy: currentUser?.id || user.id,
            targetUser: user.id,
            relatedItem: { itemId: user.id, itemModel: 'User' },
            description: `Welcome to the team, ${user.name}! Your account is ready.`,
            metadata: { hasTemporaryPassword: !!password },
            sendEmailNotification: false
        }, companyPrisma).catch(err => console.error('[Auth] Automation error:', err));

        try {
            const isFirstAdmin = !adminExists && safeRoles.includes('admin');
            const category = isFirstAdmin ? EmailService.CATEGORIES.SYSTEM : EmailService.CATEGORIES.WORK;

            EmailService.notify(user, 'welcome', {
                password: password || 'No password assigned',
                category
            }, companyPrisma).catch(emailErr => {
                console.error('[Auth] Failed to send welcome email:', emailErr.message);
            });
        } catch (emailErr) {
            console.error('[Auth] Failed to setup welcome email:', emailErr.message);
        }

        if (currentUser) {
            const Notification = companyPrisma.notification;
            const { getIo } = require('../../system-configs/sockets');
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

                await EmailService.notify(user, 'trial_started', {
                    trialDays: trialDaysActive,
                    category: EmailService.CATEGORIES.SYSTEM
                }, companyPrisma);

                const Notification = companyPrisma.notification;
                const { getIo } = require('../../system-configs/sockets');

                const trialNotification = await Notification.create({
                    data: {
                        userId: user.id,
                        type: 'system_alert',
                        title: 'Trial Evaluation Active',
                        message: `Welcome! You are currently on a ${trialDaysActive}-day free trial plan. Enjoy the platform.`,
                        link: '/dashboard/settings',
                    }
                });

                const io = getIo();
                if (io) {
                    io.to(user.id.toString()).emit('notification:new', {
                        _id: trialNotification.id.toString(),
                        type: 'system_alert',
                        title: 'Trial Evaluation Active',
                        message: `Welcome! You are currently on a ${trialDaysActive}-day free trial plan. Enjoy the platform.`,
                        link: '/dashboard/settings',
                        isRead: false,
                        createdAt: trialNotification.createdAt
                    });
                }
            } catch (billingErr) {
                console.error('[Auth] Trial creation/notification error:', billingErr.message);
            }
        }

        return { token, refreshToken, user };
    }

    static async findWorkspaces(email) {
        if (!email) {
            const err = new Error('Email is required');
            err.status = 400; throw err;
        }

        const normalizedEmail = email.toLowerCase().trim();

        // 1. Find all users matching this email and include their associated company
        const users = await globalPrisma.user.findMany({
            where: { email: normalizedEmail },
            include: { company: true }
        });

        // 2. Also check if this email is the primary adminEmail for any company
        const adminCompanies = await globalPrisma.company.findMany({
            where: { adminEmail: normalizedEmail }
        });

        const companyMap = new Map();
        for (const u of users) {
            if (u.company) companyMap.set(u.company.id, u.company);
        }
        for (const c of adminCompanies) {
            companyMap.set(c.id, c);
        }

        return Array.from(companyMap.values()).map(c => ({
            name: c.companyName || c.name,
            slug: c.slug,
            logo: c.logoUrl,
            brandColor: c.brandColor,
            _id: c.id
        })).filter(w => w.slug);
    }

    static async login(body, requestCompany) {
        const { email, password, mfaToken } = body;
        if (!email || !password) {
            const err = new Error('Email and password are required');
            err.status = 400; throw err;
        }

        const normalizedEmail = email.toLowerCase().trim();
        let company = requestCompany || null;

        // 1. Find user in the database
        let user = null;
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

        // 2. Fallback: Check if email is company primary admin
        if (!company) {
            company = await globalPrisma.company.findFirst({
                where: { adminEmail: normalizedEmail }
            });
        }

        if (!company) {
            const err = new Error("We couldn't find an account linked to this email. Please sign up to create a new workspace.");
            err.status = 401; throw err;
        }

        // 3. Workspace Status Checks
        if (!company.isOnboardingComplete) {
            let onboardingToken = company.metadata?.onboardingToken;
            let currentMetadata = company.metadata || {};
            if (typeof currentMetadata === 'string') {
                try { currentMetadata = JSON.parse(currentMetadata); } catch (e) { currentMetadata = {}; }
            }
            company = await globalPrisma.company.update({
                where: { id: company.id },
                data: { metadata: { ...currentMetadata, onboardingToken } }
            });
            const err = new Error('Your workspace requires setup. Redirecting to onboarding...');
            err.status = 403; err.onboardingRequired = true; err.onboardingToken = onboardingToken; err.company = company; throw err;
        }

        if (company.isSuspended) {
            const err = new Error(`Your workspace has been suspended: ${company.suspendedReason}. Please contact billing support.`);
            err.status = 403; throw err;
        }

        // 4. Password Verification
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
                const err = new Error('Incorrect email or password. Please try again.');
                err.status = 401; throw err;
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
                const err = new Error('Incorrect email or password. Please try again.');
                err.status = 401; throw err;
            }
            try {
                isMatch = await bcrypt.compare(password, user.passwordHash || user.password || '');
            } catch (bcryptErr) {
                isMatch = false;
            }
            if (!isMatch) {
                const err = new Error('Incorrect email or password. Please try again.');
                err.status = 401; throw err;
            }
        }

        if (!user.isActive) {
            const err = new Error('Your account has been deactivated. Please contact your workspace administrator.');
            err.status = 401; throw err;
        }

        if (user.mfaEnabled) {
            if (!mfaToken) {
                const err = new Error('MFA Required');
                err.status = 200; err.mfaRequired = true; err.userId = user.id; throw err;
            }
            const valid = totp.check(mfaToken, user.mfaSecret);
            if (!valid) {
                const err = new Error('The MFA code you entered is invalid. Please try again.');
                err.status = 401; throw err;
            }
        }

        const accessToken = signAccessToken(user.id, company.id);
        const refreshToken = signRefreshToken(user.id, company.id);

        return { accessToken, refreshToken, user, company };
    }

    static async refreshToken(refreshTokenStr) {
        if (!refreshTokenStr) {
            const err = new Error('Refresh token required');
            err.status = 400; throw err;
        }

        let decoded;
        try {
            decoded = jwt.verify(refreshTokenStr, process.env.JWT_REFRESH_SECRET);
        } catch {
            const err = new Error('Invalid or expired refresh token');
            err.status = 401; throw err;
        }

        const companyId = decoded.companyId;
        if (!companyId) {
            const err = new Error('Invalid token structure. Missing company binding.');
            err.status = 400; throw err;
        }

        const company = await globalPrisma.company.findUnique({ where: { id: companyId } });
        if (!company) {
            const err = new Error('Associated company not found');
            err.status = 401; throw err;
        }

        const companyPrisma = getCompanyPrisma(company.id);
        const user = await companyPrisma.user.findUnique({ where: { id: decoded.id } });

        if (!user) {
            const err = new Error('User not found');
            err.status = 401; throw err;
        }

        const newAccessToken = signAccessToken(user.id, company.id);
        return { token: newAccessToken, user, company };
    }

    static async getMe(companyPrisma, userObj, companyIdInput) {
        let company = null;
        if (companyIdInput) {
            company = await globalPrisma.company.findUnique({ where: { id: companyIdInput } });
        }
        return { user: userObj, company, isModuleLead: false };
    }

    static async changePassword(companyPrisma, body, currentUser, companyObj) {
        const { currentPassword, newPassword } = body;
        if (!currentPassword || !newPassword) {
            const err = new Error('Both current and new password are required');
            err.status = 400; throw err;
        }

        const isPrimaryAdmin = companyObj?.adminEmail === currentUser.email;
        const user = await companyPrisma.user.findUnique({ where: { id: currentUser.id } });

        if (isPrimaryAdmin) {
            const company = await globalPrisma.company.findUnique({ where: { id: companyObj.id } });
            if (!company) {
                const err = new Error('Company not found');
                err.status = 404; throw err;
            }

            const ok = await bcrypt.compare(currentPassword, company.adminPasswordHash || '');
            if (!ok) {
                const err = new Error('Current password is incorrect');
                err.status = 401; throw err;
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
                const err = new Error('Current password is incorrect');
                err.status = 401; throw err;
            }

            const salt = await bcrypt.genSalt(12);
            const newPasswordHash = await bcrypt.hash(newPassword, salt);
            await companyPrisma.user.update({ where: { id: user.id }, data: { passwordHash: newPasswordHash, password: null } });
        }

        return user;
    }

    static async setupMFA(companyPrisma, currentUser, companyObj) {
        const settings = await companyPrisma.settings.findFirst();
        const companyName = settings?.companyName || companyObj?.companyName || 'Your Company';
        const secret = totp.generateSecret();
        const uri = totp.keyuri(currentUser.email, companyName, secret);
        const qrCode = await qrcode.toDataURL(uri);
        return { secret, qrCode, provisioningUri: uri };
    }

    static async enableMFA(companyPrisma, body, currentUser) {
        const { secret, token } = body;
        if (!totp.check(token, secret)) {
            const err = new Error('Invalid MFA token');
            err.status = 400; throw err;
        }
        await companyPrisma.user.update({ where: { id: currentUser.id }, data: { mfaEnabled: true, mfaSecret: secret } });
        return { message: 'MFA enabled successfully' };
    }

    static async completeWorkspaceSetup(companyPrisma, body, onboardingTokenHeader, currentUser, reqCompany) {
        const { 
            companyName, slug, website, oneLineDescription, 
            industry, startupStage, teamSize, 
            enabledApps, enabledModules, 
            currency, currencySymbol, country 
        } = body;
        let user = currentUser;
        let companyId = reqCompany?.id;

        if (!user && onboardingTokenHeader) {
            if (!reqCompany || reqCompany.metadata?.onboardingToken !== onboardingTokenHeader) {
                const err = new Error('Invalid or expired onboarding token');
                err.status = 403; throw err;
            }
            user = await companyPrisma.user.findFirst({ where: { role: 'admin' } });
            companyId = reqCompany.id;
        }

        if (!user) {
            const err = new Error('Authentication required to complete setup');
            err.status = 401; throw err;
        }

        let config = await companyPrisma.companyConfig.findFirst();
        if (!config) {
            config = await companyPrisma.companyConfig.create({
                data: { companyType: industry, teamSize, enabledApps: enabledApps || [], enabledModules: enabledModules || [] }
            });
        } else {
            await companyPrisma.companyConfig.update({
                where: { id: config.id },
                data: {
                    ...(industry && { companyType: industry }),
                    ...(teamSize && { teamSize }),
                    ...(enabledApps && { enabledApps }),
                    ...(enabledModules && { enabledModules })
                }
            });
        }

        const updatedUser = await companyPrisma.user.update({ where: { id: user.id }, data: { isFirstLogin: false } });
        if (!updatedUser) {
            const err = new Error('Admin user not found in workspace');
            err.status = 404; throw err;
        }

        const company = await globalPrisma.company.findUnique({ where: { id: companyId } });
        let metadata = company.metadata || {};
        if (typeof metadata === 'string') { try { metadata = JSON.parse(metadata); } catch (e) { metadata = {}; } }
        metadata.onboardingToken = null;

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
                metadata
            }
        });

        const { redis } = require('../../system-configs/config/redis.js');
        if (redis) {
            try { await redis.del(`company:${companyId.toString()}`); } catch (err) { }
        }

        const accessToken = signAccessToken(updatedUser.id, companyId);
        const refreshToken = signRefreshToken(updatedUser.id, companyId);

        const hashed = await bcrypt.hash(refreshToken, 8);
        const newRefreshTokens = [...(updatedUser.refreshTokens || []).slice(-4), hashed];
        await companyPrisma.user.update({ where: { id: updatedUser.id }, data: { refreshTokens: newRefreshTokens } });

        try {
            const ps = await globalPrisma.platformSettings.findFirst();
            const loginUrl = ps?.platformApiUrl || process.env.CLIENT_URL || '';
            await EmailService.notify(updatedUser, 'company_welcome', { loginUrl }, companyPrisma);
        } catch (emailErr) { }

        return { token: accessToken, refreshToken, user: updatedUser, config, companyId, companyType, teamSize, enabledApps };
    }

    static async forgotPassword(body, reqCompany) {
        const { email } = body;
        if (!email) {
            const err = new Error('Email is required');
            err.status = 400; throw err;
        }

        const normalizedEmail = email.toLowerCase().trim();
        let company = reqCompany || null;
        let user = null;

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
        const userRole = user?.role || (user?.roles && user?.roles[0]) || (isPrimaryAdmin ? 'admin' : 'employee');
        const adminRoles = ['admin', 'manager'];
        if (!adminRoles.includes(userRole) && !isPrimaryAdmin) {
            const err = new Error('Password reset via email is only available for admin and manager accounts. Please contact your administrator.');
            err.status = 403; throw err;
        }

        const crypto = require('crypto');
        const tempPassword = crypto.randomBytes(5).toString('hex');

        if (isPrimaryAdmin) {
            const salt = await bcrypt.genSalt(12);
            const hashedTemp = await bcrypt.hash(tempPassword, salt);
            await globalPrisma.company.update({ where: { id: company.id }, data: { adminPasswordHash: hashedTemp } });

            if (user && (user.passwordHash || user.password)) {
                await globalPrisma.user.update({ where: { id: user.id }, data: { passwordHash: null, password: null } });
            }
        } else if (user) {
            const salt = await bcrypt.genSalt(10);
            const hashedTemp = await bcrypt.hash(tempPassword, salt);
            await globalPrisma.user.update({ where: { id: user.id }, data: { password: hashedTemp } });
        }

        try {
            const companyName = company.companyName || company.name || 'Your Company';
            await EmailService.sendForgotPasswordEmail(user || { email: normalizedEmail, name: company.adminName || 'Admin' }, tempPassword, companyName, globalPrisma);
        } catch (emailErr) { }

        return { user: user || { email: normalizedEmail } };
    }

    static async checkForgotEligibility(query) {
        const email = (query.email || '').toLowerCase().trim();
        if (!email) return false;

        const user = await globalPrisma.user.findFirst({
            where: { email }
        });
        if (user) {
            const userRole = user.role || (user.roles && user.roles[0]) || 'employee';
            return ['admin', 'manager'].includes(userRole);
        }

        const company = await globalPrisma.company.findFirst({
            where: { adminEmail: email }
        });
        return !!company;
    }

    static async googleLogin(body) {
        const { tokenId } = body;
        if (!tokenId) {
            const err = new Error('Google tokenId is required');
            err.status = 400; throw err;
        }

        // Clean the client ID in case it was pasted into Render with quotes
        const clientId = (process.env.GOOGLE_CLIENT_ID || '').replace(/"/g, '').replace(/'/g, '').trim();

        const { OAuth2Client } = require('google-auth-library');
        const client = new OAuth2Client(clientId);

        let ticket;
        try {
            ticket = await client.verifyIdToken({
                idToken: tokenId,
                audience: clientId,
            });
        } catch (error) {
            const decoded = jwt.decode(tokenId);
            console.error('[GoogleLogin] verifyIdToken error:', error.message);
            console.error('[GoogleLogin] Expected Audience:', clientId);
            console.error('[GoogleLogin] Actual Token Audience:', decoded?.aud);

            const err = new Error('Google authentication failed: ' + error.message);
            err.status = 401;
            throw err;
        }

        const payload = ticket.getPayload();
        const email = payload.email.toLowerCase();

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
            const err = new Error("We couldn't find an account linked to this email. Please sign up to create a new workspace.");
            err.status = 404; throw err;
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
                }
            });
        } else {
            let updateData = {};
            if (payload.picture && !user.photoUrl) {
                updateData.photoUrl = payload.picture;
            }
            if (!user.googleId) {
                updateData.googleId = payload.sub;
            }
            if (Object.keys(updateData).length > 0) {
                user = await globalPrisma.user.update({
                    where: { id: user.id },
                    data: updateData
                });
            }
        }

        if (!user.isActive) {
            const err = new Error('Your account has been deactivated.');
            err.status = 403; throw err;
        }

        const token = signAccessToken(user.id, company.id);
        const refreshToken = signRefreshToken(user.id, company.id);

        return { token, refreshToken, user, company };
    }

    static async sendOtp(email) {
        const normalizedEmail = email.toLowerCase().trim();
        
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date();
        otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);
        
        let user = await globalPrisma.user.findUnique({ where: { email: normalizedEmail } });
        
        if (user) {
            if (user.username || user.companyId) {
                const err = new Error("Please sign in, you are already registered in our platform.");
                err.code = "USER_EXISTS"; throw err;
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

    static async verifyOtp(email, otp) {
        const normalizedEmail = email.toLowerCase().trim();
        
        const user = await globalPrisma.user.findUnique({ where: { email: normalizedEmail } });
        if (!user) {
            const err = new Error("User not found");
            err.status = 404; throw err;
        }

        if (user.otpCode !== otp || !user.otpExpiry || user.otpExpiry < new Date()) {
            const err = new Error("Invalid or expired OTP");
            err.status = 400; throw err;
        }

        await globalPrisma.user.update({
            where: { email: normalizedEmail },
            data: { otpCode: null, otpExpiry: null, isEmailVerified: true },
        });
        
        return true;
    }

    static async onboarding(email, data) {
        const { role, name, username, headline, city, country, socialLinks, bio, interests } = data;
        
        // Check if username is already taken by someone else
        if (username) {
            const existingUser = await globalPrisma.user.findFirst({
                where: { 
                    username, 
                    email: { not: email } 
                }
            });
            if (existingUser) {
                const err = new Error("Username is already taken");
                err.code = 'USERNAME_TAKEN'; throw err;
            }
        }

        const user = await globalPrisma.user.update({
            where: { email },
            data: {
                ...(name && { name }),
                ...(role && { role }),
                ...(username && { username }),
                ...(headline && { headline }),
                ...(city && { city }),
                ...(country && { country }),
                ...(socialLinks && { socialLinks }),
                ...(bio && { bio }),
                ...(interests && { interests }),
                isFirstLogin: false // Marking as completed onboarding
            },
        });

        return user;
    }

    static async checkUsername(username) {
        const user = await globalPrisma.user.findFirst({
            where: { username }
        });
        return !user;
    }
}

module.exports = AuthService;
