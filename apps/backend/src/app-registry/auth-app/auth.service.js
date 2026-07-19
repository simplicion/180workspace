'use strict';

const { logAction } = require('../../system-configs/middleware/audit/audit.js');
const { signAccessToken, signRefreshToken } = require('../../system-configs/middleware/auth/auth.js');
const { totp } = require('otplib');
const qrcode = require('qrcode');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const BillingService = require('../finance-app/bills/billing.service');
const EmailService = require('../productivity-tools-app/emails/email.service');
const { prisma: globalPrisma, getTenantPrisma } = require('@workspace/db');

class AuthService {
    
    static async register(tenantDb, body, company, currentUser) {
        const { name, email, password, role, roles, department, designationId, position, permissions, employmentType, workLocation, managerId, phone, emergencyContact, salary, leaveBalance, joinDate } = body;
        
        if (!name || !email || !password) {
            const err = new Error('Name, email, and password are required');
            err.status = 400; throw err;
        }

        const TenantUser = tenantDb.user;
        const exists = await TenantUser.findFirst({ where: { email: email.toLowerCase() } });
        if (exists) {
            const err = new Error('Email already registered in this workspace');
            err.status = 409; throw err;
        }

        const globalAdmin = await globalPrisma.company.findFirst({ where: { adminEmail: email.toLowerCase() } });
        if (globalAdmin && globalAdmin.id !== company?.id) {
            const err = new Error('This email is registered as an administrator of another workspace and cannot be added to this one.');
            err.status = 403; throw err;
        }

        const adminExists = await TenantUser.findFirst({ where: { role: 'admin' }, select: { id: true } });
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
        if (!employeeId && safeRoles.some(r => ['employee', 'manager', 'hr'].includes(r))) {
            const count = await TenantUser.count();
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
            const Designation = tenantDb.designation;
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

        const user = await TenantUser.create({ data: { 
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
            joinDate: joinDate ? new Date(joinDate) : undefined
        } });

        const companyRecord = await globalPrisma.company.findUnique({ where: { id: company.id } });
        await globalPrisma.tenantUserMapping.upsert({
            where: { userId_companyId: { userId: user.id, companyId: company.id } },
            update: { 
                email: user.email.toLowerCase(),
                role: safeRoles[0] || 'employee',
                subdomain: companyRecord?.subdomain || 'default'
            },
            create: { 
                userId: user.id,
                email: user.email.toLowerCase(), 
                companyId: company.id,
                subdomain: companyRecord?.subdomain || 'default',
                role: safeRoles[0] || 'employee'
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
        }, tenantDb).catch(err => console.error('[Auth] Automation error:', err));

        try {
            const isFirstAdmin = !adminExists && safeRoles.includes('admin');
            const category = isFirstAdmin ? EmailService.CATEGORIES.SYSTEM : EmailService.CATEGORIES.WORK;
            
            EmailService.notify(user, 'welcome', { 
                password: password || 'No password assigned',
                category 
            }, tenantDb).catch(emailErr => {
                console.error('[Auth] Failed to send welcome email:', emailErr.message);
            });
        } catch (emailErr) {
            console.error('[Auth] Failed to setup welcome email:', emailErr.message);
        }

        if (currentUser) {
            const Notification = tenantDb.notification;
            const { getIo } = require('../../system-configs/sockets');
            const Settings = tenantDb.settings;
            const settings = await Settings.findFirst();
            const companyName = settings?.companyName || company?.companyName || 'Your Company';
            const subject = encodeURIComponent(`Welcome to ${companyName}`);
            const bodyStr = encodeURIComponent(`Hi ${user.name},\n\nYour account has been created.\nEmail: ${user.email}\nPassword: ${password}\n\nLogin at: ${process.env.CLIENT_URL}`);
            const actionUrl = `mailto:${user.email}?subject=${subject}&body=${bodyStr}`;

            const notification = await Notification.create({ data: {
                userId: currentUser.id,
                type: 'email_pending',
                title: 'Send Welcome Email',
                message: `New user ${user.name} created. Click to send their credentials.`,
                actionUrl,
            } });
            const io = getIo();
            if (io) {
                io.to(currentUser.id.toString()).emit('notification:new', {
                    _id: notification.id.toString(),
                    type: 'email_pending',
                    title: 'Send Welcome Email',
                    message: `New user ${user.name} created. Click to send their credentials.`,
                    actionUrl,
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
                }, tenantDb);

                const Notification = tenantDb.notification;
                const { getIo } = require('../../system-configs/sockets');
                
                const trialNotification = await Notification.create({ data: {
                    userId: user.id,
                    type: 'system_alert',
                    title: 'Trial Evaluation Active',
                    message: `Welcome! You are currently on a ${trialDaysActive}-day free trial plan. Enjoy the platform.`,
                    link: '/dashboard/settings',
                } });

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
        const mappings = await globalPrisma.tenantUserMapping.findMany({
            where: { email: email.toLowerCase() },
            include: { company: true }
        });

        return mappings.map(m => ({
            name: m.company?.companyName,
            slug: m.company?.slug,
            logo: m.company?.logoUrl,
            brandColor: m.company?.brandColor,
            _id: m.company?.id
        })).filter(w => w.slug);
    }

    static async login(body, requestCompany) {
        const { email, password, mfaToken } = body;
        if (!email || !password) {
            const err = new Error('Email and password are required');
            err.status = 400; throw err;
        }

        let company = requestCompany || null;

        if (!company) {
            const mapping = await globalPrisma.tenantUserMapping.findFirst({
                where: { email: email.toLowerCase() }
            });
            if (mapping) {
                company = await globalPrisma.company.findUnique({ where: { id: mapping.companyId } });
            }
        }

        if (!company) {
            const unconfiguredCompany = await globalPrisma.company.findFirst({
                where: { adminEmail: email.toLowerCase() }
            });

            if (unconfiguredCompany) {
                const isMatch = await bcrypt.compare(password, unconfiguredCompany.adminPasswordHash || '');
                if (isMatch) {
                    if (!unconfiguredCompany.databaseConfigured) {
                        const err = new Error('Your workspace setup is incomplete. Please complete your registration or contact support.');
                        err.status = 403; err.setupToken = unconfiguredCompany.metadata?.setupToken; throw err;
                    }
                    company = unconfiguredCompany;
                } else {
                    const err = new Error('Incorrect email or password. Please try again.');
                    err.status = 401; throw err;
                }
            }
        }

        if (!company) {
            const err = new Error('We couldn\'t find an account with that email. Please sign up or contact your administrator.');
            err.status = 401; throw err;
        }

        if (!company.databaseConfigured) {
            const err = new Error('Your workspace setup is incomplete. Please complete your registration or contact support.');
            err.status = 403; err.setupToken = company.metadata?.setupToken; throw err;
        }

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

        let tenantPrisma;
        try {
            tenantPrisma = getTenantPrisma(company.id);
        } catch (dbErr) {
            const err = new Error('We\'re having trouble connecting to your workspace data. Please try again in a few moments or contact support.');
            err.status = 500; throw err;
        }

        const isPrimaryAdmin = company.adminEmail && company.adminEmail.toLowerCase() === email.toLowerCase();
        let isMatch = false;
        let user;

        if (isPrimaryAdmin) {
            if (!company.adminPasswordHash) {
                const fullCompany = await globalPrisma.company.findUnique({ where: { id: company.id } });
                if (fullCompany) {
                    company.adminPasswordHash = fullCompany.adminPasswordHash;
                } else {
                    const err = new Error('Authentication error. Please contact support.');
                    err.status = 500; throw err;
                }
            }

            isMatch = await bcrypt.compare(password, company.adminPasswordHash || '');
            if (!isMatch) {
                const err = new Error('Incorrect email or password. Please try again.');
                err.status = 401; throw err;
            }

            user = await tenantPrisma.user.findFirst({ where: { email: email.toLowerCase() } });
            if (!user) {
                user = await tenantPrisma.user.create({ data: {
                    name: company.adminName || 'Workspace Admin',
                    email: email.toLowerCase(),
                    role: 'admin',
                    isActive: true
                } });
            }
        } else {
            user = await tenantPrisma.user.findFirst({ where: { email: email.toLowerCase() } });
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
            const err = new Error('Invalid token structure. Missing tenant binding.');
            err.status = 400; throw err;
        }

        const company = await globalPrisma.company.findUnique({ where: { id: companyId } });
        if (!company) {
            const err = new Error('Associated company not found');
            err.status = 401; throw err;
        }

        const tenantPrisma = getTenantPrisma(company.id);
        const user = await tenantPrisma.user.findUnique({ where: { id: decoded.id } });
        if (!user) {
            const err = new Error('User not found');
            err.status = 401; throw err;
        }

        const newAccessToken = signAccessToken(user.id, company.id);
        return { token: newAccessToken, user, company };
    }

    static async getMe(tenantDb, userObj, companyIdInput) {
        let company = null;
        if (companyIdInput) {
            company = await globalPrisma.company.findUnique({ where: { id: companyIdInput } });
        }
        return { user: userObj, company, isModuleLead: false };
    }

    static async changePassword(tenantDb, body, currentUser, companyObj) {
        const { currentPassword, newPassword } = body;
        if (!currentPassword || !newPassword) {
            const err = new Error('Both current and new password are required');
            err.status = 400; throw err;
        }

        const isPrimaryAdmin = companyObj?.adminEmail === currentUser.email;
        const user = await tenantDb.user.findUnique({ where: { id: currentUser.id } });
        
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
                await tenantDb.user.update({ where: { id: user.id }, data: { passwordHash: null, password: null } });
            }
        } else {
            const ok = await bcrypt.compare(currentPassword, user.passwordHash || user.password || '');
            if (!ok) {
                const err = new Error('Current password is incorrect');
                err.status = 401; throw err;
            }

            const salt = await bcrypt.genSalt(12);
            const newPasswordHash = await bcrypt.hash(newPassword, salt);
            await tenantDb.user.update({ where: { id: user.id }, data: { passwordHash: newPasswordHash, password: null } });
        }

        return user;
    }

    static async setupMFA(tenantDb, currentUser, companyObj) {
        const settings = await tenantDb.settings.findFirst();
        const companyName = settings?.companyName || companyObj?.companyName || 'Your Company';
        const secret = totp.generateSecret();
        const uri = totp.keyuri(currentUser.email, companyName, secret);
        const qrCode = await qrcode.toDataURL(uri);
        return { secret, qrCode, provisioningUri: uri };
    }

    static async enableMFA(tenantDb, body, currentUser) {
        const { secret, token } = body;
        if (!totp.check(token, secret)) {
            const err = new Error('Invalid MFA token');
            err.status = 400; throw err;
        }
        await tenantDb.user.update({ where: { id: currentUser.id }, data: { mfaEnabled: true, mfaSecret: secret } });
        return { message: 'MFA enabled successfully' };
    }

    static async completeWorkspaceSetup(tenantDb, body, onboardingTokenHeader, currentUser, reqCompany) {
        const { companyType, teamSize, enabledApps, enabledModules } = body;
        let user = currentUser;
        let companyId = reqCompany?.id;

        if (!user && onboardingTokenHeader) {
            if (!reqCompany || reqCompany.metadata?.onboardingToken !== onboardingTokenHeader) {
                const err = new Error('Invalid or expired onboarding token');
                err.status = 403; throw err;
            }
            user = await tenantDb.user.findFirst({ where: { role: 'admin' } });
            companyId = reqCompany.id;
        }

        if (!user) {
            const err = new Error('Authentication required to complete setup');
            err.status = 401; throw err;
        }

        let config = await tenantDb.companyConfig.findFirst();
        if (!config) {
            config = await tenantDb.companyConfig.create({
                data: { companyType, teamSize, enabledApps: enabledApps || [], enabledModules: enabledModules || [] }
            });
        } else {
            await tenantDb.companyConfig.update({
                where: { id: config.id },
                data: {
                    ...(companyType && { companyType }),
                    ...(teamSize && { teamSize }),
                    ...(enabledApps && { enabledApps }),
                    ...(enabledModules && { enabledModules })
                }
            });
        }

        const updatedUser = await tenantDb.user.update({ where: { id: user.id }, data: { isFirstLogin: false } });
        if (!updatedUser) {
            const err = new Error('Admin user not found in workspace');
            err.status = 404; throw err;
        }

        const company = await globalPrisma.company.findUnique({ where: { id: companyId } });
        let metadata = company.metadata || {};
        if (typeof metadata === 'string') { try { metadata = JSON.parse(metadata); } catch(e) { metadata = {}; } }
        metadata.onboardingToken = null;
        
        await globalPrisma.company.update({ where: { id: companyId }, data: {
            isOnboardingComplete: true,
            metadata
        } });

        const { redis } = require('../../system-configs/config/redis.js');
        if (redis) {
            try { await redis.del(`company:${companyId.toString()}`); } catch (err) {}
        }

        const accessToken = signAccessToken(updatedUser.id, companyId);
        const refreshToken = signRefreshToken(updatedUser.id, companyId);

        const hashed = await bcrypt.hash(refreshToken, 8);
        const newRefreshTokens = [...(updatedUser.refreshTokens || []).slice(-4), hashed];
        await tenantDb.user.update({ where: { id: updatedUser.id }, data: { refreshTokens: newRefreshTokens } });

        try {
            const ps = await globalPrisma.platformSettings.findFirst();
            const loginUrl = ps?.platformApiUrl || process.env.CLIENT_URL || '';
            await EmailService.notify(updatedUser, 'company_welcome', { loginUrl }, tenantDb);
        } catch (emailErr) {}

        return { token: accessToken, refreshToken, user: updatedUser, config, companyId, companyType, teamSize, enabledApps };
    }

    static async forgotPassword(body, reqCompany) {
        const { email } = body;
        if (!email) {
            const err = new Error('Email is required');
            err.status = 400; throw err;
        }

        let company = reqCompany || null;
        if (!company) {
            const mapping = await globalPrisma.tenantUserMapping.findFirst({ 
                where: { email: email.toLowerCase() },
                include: { company: true }
            });
            company = mapping ? mapping.company : null;
        }

        if (!company || !company.databaseConfigured) return { user: null };

        let tenantPrisma;
        try { tenantPrisma = getTenantPrisma(company.id); } catch { return { user: null }; }

        const user = await tenantPrisma.user.findFirst({ where: { email: email.toLowerCase() } });
        if (!user) return { user: null };

        const userRole = user.role || (user.roles && user.roles[0]) || 'employee';
        const adminRoles = ['admin', 'manager'];
        if (!adminRoles.includes(userRole)) {
            const err = new Error('Password reset via email is only available for admin and manager accounts. Please contact your administrator.');
            err.status = 403; throw err;
        }

        const crypto = require('crypto');
        const tempPassword = crypto.randomBytes(5).toString('hex');
        
        const isPrimaryAdmin = company.adminEmail && company.adminEmail.toLowerCase() === email.toLowerCase();
        
        if (isPrimaryAdmin) {
            const salt = await bcrypt.genSalt(12);
            const hashedTemp = await bcrypt.hash(tempPassword, salt);
            await globalPrisma.company.update({ where: { id: company.id }, data: { adminPasswordHash: hashedTemp } });
            
            if (user.passwordHash || user.password) {
                await tenantPrisma.user.update({ where: { id: user.id }, data: { passwordHash: null, password: null } });
            }
        } else {
            const salt = await bcrypt.genSalt(10);
            const hashedTemp = await bcrypt.hash(tempPassword, salt);
            await tenantPrisma.user.update({ where: { id: user.id }, data: { password: hashedTemp } });
        }

        try {
            const companyName = company.companyName || company.name || 'Your Company';
            await EmailService.sendForgotPasswordEmail(user, tempPassword, companyName, tenantPrisma);
        } catch (emailErr) {}

        return { user };
    }

    static async checkForgotEligibility(query) {
        const email = (query.email || '').toLowerCase().trim();
        if (!email) return false;

        const mapping = await globalPrisma.tenantUserMapping.findFirst({ 
            where: { email },
            include: { company: true }
        });
        if (!mapping || !mapping.company?.databaseConfigured) return false;

        let tenantPrisma;
        try { tenantPrisma = getTenantPrisma(mapping.companyId); } catch { return false; }

        const user = await tenantPrisma.user.findFirst({ where: { email } });
        if (!user) return false;

        const userRole = user.role || (user.roles && user.roles[0]) || 'employee';
        return ['admin', 'manager'].includes(userRole);
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
            // Log the decoded token's audience for easier debugging
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
        
        let user = await globalPrisma.user.findUnique({
            where: { email },
            include: { company: true }
        });

        if (!user || !user.company) {
             const err = new Error('No workspace found for this Google account. Please create an account.');
             err.status = 404; throw err;
        }
        
        if (!user.company.databaseConfigured) {
             const err = new Error('Workspace database not configured. Please complete setup.');
             err.status = 404; throw err;
        }

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
                data: updateData,
                include: { company: true }
            });
        }

        if (!user.isActive) {
            const err = new Error('Your account has been deactivated.');
            err.status = 403; throw err;
        }

        const token = signAccessToken(user.id, user.company.id);
        const refreshToken = signRefreshToken(user.id, user.company.id);
        
        return { token, refreshToken, user, company: user.company };
    }
}

module.exports = AuthService;
