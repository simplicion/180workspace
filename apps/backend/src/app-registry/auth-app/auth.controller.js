'use strict';

const AuthService = require('./auth.service');
const { logAction } = require('../../system-configs/middleware/audit/audit.js');
const { sanitizeUser } = require('../../system-configs/utils/sanitize-user');

exports.register = async (req, res, next) => {
    try {
        if (!req.prisma) {
            return res.status(400).json({ error: 'Workspace context missing. Cannot register user.' });
        }
        
        const result = await AuthService.register(req.prisma, req.body, req.company, req.user);
        
        await logAction(result.user.id, 'REGISTER', 'user', result.user.id, {}, req);
        res.status(201).json({ 
            token: result.token, 
            refreshToken: result.refreshToken, 
            user: sanitizeUser(result.user) 
        });
    } catch (err) { next(err); }
};

exports.findWorkspaces = async (req, res, next) => {
    try {
        const workspaces = await AuthService.findWorkspaces(req.query.email);
        res.json({ workspaces });
    } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
    try {
        const result = await AuthService.login(req.body, req.company);
        
        req.company = result.company;
        if (result.user) {
            req.user = { role: result.user.role || (result.user.roles && result.user.roles[0]) };
        }

        await logAction(result.user.id || result.user._id, 'LOGIN', 'user', result.user.id || result.user._id, {}, req);

        res.json({
            token: result.accessToken,
            refreshToken: result.refreshToken,
            user: sanitizeUser(result.user),
            company: {
                _id: result.company.id,
                companyName: result.company.companyName || result.company.name,
                slug: result.company.slug || null,
                customDomain: result.company.customDomain || null,
                logoUrl: result.company.logoUrl,
                databaseConfigured: result.company.databaseConfigured,
                isSuspended: result.company.isSuspended,
                suspendedReason: result.company.suspendedReason,
                isOnboardingComplete: result.company.isOnboardingComplete,
                metadata: typeof result.company.metadata === 'string' ? JSON.parse(result.company.metadata) : (result.company.metadata || {}),
            }
        });
    } catch (err) { 
        if (err.status === 200 && err.mfaRequired) {
            return res.status(200).json({ mfaRequired: true, userId: err.userId });
        }
        if (err.status === 403 && err.setupToken) {
            return res.status(403).json({ error: err.message, setupToken: err.setupToken });
        }
        if (err.status === 403 && err.onboardingRequired) {
            return res.status(403).json({
                error: err.message,
                onboardingRequired: true,
                onboardingToken: err.onboardingToken
            });
        }
        next(err); 
    }
};

exports.logout = async (req, res, next) => {
    try {
        res.json({ message: 'Logged out successfully' });
    } catch (err) { next(err); }
};

exports.refreshToken = async (req, res, next) => {
    try {
        const result = await AuthService.refreshToken(req.body.refreshToken);
        req.user = result.user;
        req.company = result.company;
        res.json({ token: result.token });
    } catch (err) { next(err); }
};

exports.getMe = async (req, res, next) => {
    try {
        const result = await AuthService.getMe(req.prisma, req.user, req.user.companyId || req.company?.id);
        
        const sanitizedUser = sanitizeUser(result.user);
        sanitizedUser.isModuleLead = result.isModuleLead;

        let meta = result.company?.metadata || {};
        if (typeof meta === 'string') {
            try { meta = JSON.parse(meta); } catch(e) { meta = {}; }
        }

        res.json({
            user: sanitizedUser,
            company: result.company ? {
                _id: result.company.id,
                companyName: result.company.name,
                slug: result.company.slug || null,
                customDomain: result.company.customDomain || null,
                logoUrl: result.company.logoUrl,
                databaseConfigured: result.company.databaseConfigured,
                isSuspended: result.company.isSuspended,
                suspendedReason: result.company.suspendedReason,
                isOnboardingComplete: result.company.isOnboardingComplete,
                metadata: meta,
                enabledApps: meta.enabledApps || [],
                enabledModules: meta.enabledModules || []
            } : null
        });
    } catch (err) { next(err); }
};

exports.changePassword = async (req, res, next) => {
    try {
        const user = await AuthService.changePassword(req.prisma, req.body, req.user, req.company);
        await logAction(user.id, 'CHANGE_PASSWORD', 'user', user.id, {}, req);
        res.json({ message: 'Password updated successfully' });
    } catch (err) { next(err); }
};

exports.setupMFA = async (req, res, next) => {
    try {
        const result = await AuthService.setupMFA(req.prisma, req.user, req.company);
        res.json(result);
    } catch (err) { next(err); }
};

exports.enableMFA = async (req, res, next) => {
    try {
        const result = await AuthService.enableMFA(req.prisma, req.body, req.user);
        await logAction(req.user.id, 'MFA_ENABLED', 'user', req.user.id, {}, req);
        res.json(result);
    } catch (err) { next(err); }
};

exports.verifyMFA = async (req, res, next) => {
    try {
        return res.status(400).json({ error: 'Please submit MFA via the main /login endpoint.' });
    } catch (err) { next(err); }
};

exports.completeWorkspaceSetup = async (req, res, next) => {
    try {
        const result = await AuthService.completeWorkspaceSetup(req.prisma, req.body, req.headers['x-onboarding-token'], req.user, req.company);
        
        await logAction(result.user.id, 'WORKSPACE_SETUP_COMPLETED', 'system', result.user.id, { companyType: result.companyType, teamSize: result.teamSize, enabledApps: result.enabledApps }, req);

        res.json({
            success: true,
            message: 'Workspace configuration completed successfully.',
            token: result.token,
            refreshToken: result.refreshToken,
            user: sanitizeUser(result.user),
            config: result.config
        });
    } catch (err) { next(err); }
};

exports.forgotPassword = async (req, res, next) => {
    try {
        const result = await AuthService.forgotPassword(req.body, req.company);
        if (result && result.user) {
            await logAction(result.user.id, 'FORGOT_PASSWORD', 'user', result.user.id, {}, req);
        }
        res.json({ message: 'If that email is registered and eligible, a new password has been sent.' });
    } catch (err) { next(err); }
};

exports.checkForgotEligibility = async (req, res, next) => {
    try {
        const eligible = await AuthService.checkForgotEligibility(req.query);
        res.json({ eligible });
    } catch (err) { next(err); }
};

exports.googleLogin = async (req, res, next) => {
    try {
        const result = await AuthService.googleLogin(req.body);

        let metadata = {};
        if (result.company.metadata) {
            try {
                metadata = typeof result.company.metadata === 'string' ? JSON.parse(result.company.metadata) : result.company.metadata;
            } catch(e) {}
        }

        res.json({
            token: result.token,
            refreshToken: result.refreshToken,
            user: sanitizeUser(result.user),
            company: {
                id: result.company.id,
                _id: result.company.id,
                name: result.company.name,
                companyName: result.company.name,
                slug: result.company.slug,
                customDomain: result.company.customDomain,
                databaseConfigured: result.company.databaseConfigured,
                isOnboardingComplete: result.company.isOnboardingComplete,
                onboardingToken: metadata.onboardingToken,
                setupToken: metadata.setupToken
            }
        });
    } catch (err) { next(err); }
};

const nodemailer = require('nodemailer');

exports.sendOtpEmail = async (req, res, next) => {
    try {
        const { email, otpCode } = req.body;
        
        if (!email || !otpCode) {
            return res.status(400).json({ success: false, message: "Email and OTP are required" });
        }

        // Setup Nodemailer
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        // Send Email
        const mailOptions = {
            from: process.env.EMAIL_FROM || '"PitchIn Auth" <noreply@pitchin180.com>',
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

        res.json({ success: true, message: "OTP email sent successfully" });
    } catch (err) {
        console.error("Error sending OTP email:", err);
        next(err);
    }
};

module.exports = exports;
