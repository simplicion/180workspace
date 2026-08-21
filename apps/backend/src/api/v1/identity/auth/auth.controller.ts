import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@workspace/identity';
import { logAction } from '../../../../system-configs/utils/audit';
import { sanitizeUser } from '../../../../system-configs/utils/sanitize-user';

export class AuthController {
    static async registerUser(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await AuthService.register(req.body, (req as any).company, (req as any).user);
            await logAction(result.user.id, 'REGISTER', 'user', result.user.id, {}, req);
            res.status(201).json({ 
                token: result.token, 
                refreshToken: result.refreshToken, 
                user: sanitizeUser(result.user) 
            });
        } catch (err) { next(err); }
    }

    static async registerTenant(req: Request, res: Response, next: NextFunction) {
        try {
            const { name, email, password, companyName } = req.body;
            if (!email || !password || !name || !companyName) {
                return res.status(400).json({ error: 'Missing required fields' });
            }
            const result = await AuthService.registerTenant(req.body);
            res.status(201).json({ success: true, user: sanitizeUser(result.user) });
        } catch (err) { next(err); }
    }

    static async findWorkspaces(req: Request, res: Response, next: NextFunction) {
        try {
            const workspaces = await AuthService.findWorkspaces(req.query.email as string);
            res.json({ workspaces });
        } catch (err) { next(err); }
    }

    static async login(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await AuthService.login(req.body, (req as any).company);
            
            (req as any).company = result.company;
            if (result.user) {
                (req as any).user = { role: result.user.role || (result.user.roles && result.user.roles[0]) };
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
        } catch (err: any) { 
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
    }

    static async logout(req: Request, res: Response, next: NextFunction) {
        try {
            res.json({ message: 'Logged out successfully' });
        } catch (err) { next(err); }
    }

    static async refreshToken(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await AuthService.refreshToken(req.body.refreshToken);
            (req as any).user = result.user;
            (req as any).company = result.company;
            res.json({ token: result.token });
        } catch (err) { next(err); }
    }

    static async getMe(req: Request, res: Response, next: NextFunction) {
        try {
            const reqUser = (req as any).user;
            const reqCompany = (req as any).company;
            const result = await AuthService.getMe(reqUser, reqUser.companyId || reqCompany?.id);
            
            const sanitizedUser = sanitizeUser(result.user);
            (sanitizedUser as any).isModuleLead = result.isModuleLead;

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
    }

    static async changePassword(req: Request, res: Response, next: NextFunction) {
        try {
            const user = await AuthService.changePassword(req.body, (req as any).user, (req as any).company);
            await logAction(user.id, 'CHANGE_PASSWORD', 'user', user.id, {}, req);
            res.json({ message: 'Password updated successfully' });
        } catch (err) { next(err); }
    }

    static async setupMFA(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await AuthService.setupMFA((req as any).user, (req as any).company);
            res.json(result);
        } catch (err) { next(err); }
    }

    static async enableMFA(req: Request, res: Response, next: NextFunction) {
        try {
            const reqUser = (req as any).user;
            const result = await AuthService.enableMFA(req.body, reqUser);
            await logAction(reqUser.id, 'MFA_ENABLED', 'user', reqUser.id, {}, req);
            res.json(result);
        } catch (err) { next(err); }
    }

    static async verifyMFA(req: Request, res: Response, next: NextFunction) {
        try {
            return res.status(400).json({ error: 'Please submit MFA via the main /login endpoint.' });
        } catch (err) { next(err); }
    }

    static async completeWorkspaceSetup(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await AuthService.completeWorkspaceSetup(req.body, req.headers['x-onboarding-token'] as string, (req as any).user, (req as any).company);
            
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
    }

    static async forgotPassword(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await AuthService.forgotPassword(req.body, (req as any).company);
            if (result && result.user) {
                await logAction(result.user.id, 'FORGOT_PASSWORD', 'user', result.user.id, {}, req);
            }
            res.json({ message: 'If that email is registered and eligible, a new password has been sent.' });
        } catch (err) { next(err); }
    }

    static async checkForgotEligibility(req: Request, res: Response, next: NextFunction) {
        try {
            const eligible = await AuthService.checkForgotEligibility(req.query);
            res.json({ eligible });
        } catch (err) { next(err); }
    }

    static async googleLogin(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await AuthService.googleLogin(req.body);

            let metadata: any = {};
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
    }

    static async sendOtpEmail(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, otpCode } = req.body;
            if (!email || !otpCode) {
                return res.status(400).json({ success: false, message: "Email and OTP are required" });
            }
            await AuthService.sendOtpEmail(email, otpCode);
            res.json({ success: true, message: "OTP email sent successfully" });
        } catch (err) { next(err); }
    }

    static async sendOtp(req: Request, res: Response, next: NextFunction) {
        try {
            const { email } = req.body;
            if (!email) {
                return res.status(400).json({ success: false, message: "Email is required" });
            }
            
            const result = await AuthService.sendOtp(email);
            await AuthService.sendOtpEmail(email, result.otpCode);
            
            res.json({ success: true, message: "OTP email sent successfully" });
        } catch (err: any) {
            if (err.code === 'USER_EXISTS') {
                return res.status(400).json({ success: false, message: err.message, code: err.code });
            }
            next(err);
        }
    }

    static async verifyOtp(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, otp } = req.body;
            if (!email || !otp) {
                return res.status(400).json({ success: false, message: "Email and OTP are required" });
            }
            
            await AuthService.verifyOtp(email, otp);
            res.json({ success: true, message: "Email verified" });
        } catch (err: any) {
            return res.status(400).json({ success: false, message: err.message });
        }
    }

    static async onboarding(req: Request, res: Response, next: NextFunction) {
        try {
            const reqUser = (req as any).user;
            if (!reqUser || !reqUser.email) {
                return res.status(400).json({ success: false, message: "Unauthorized" });
            }
            const user = await AuthService.onboarding(reqUser.email, req.body);
            res.json({ success: true, message: "Onboarding completed successfully", user: sanitizeUser(user) });
        } catch (err: any) {
            if (err.code === 'USERNAME_TAKEN') {
                return res.status(400).json({ success: false, message: "Username is already taken" });
            }
            next(err);
        }
    }

    static async checkUsername(req: Request, res: Response, next: NextFunction) {
        try {
            const { username } = req.query;
            if (!username) {
                return res.status(400).json({ success: false, message: "Username is required" });
            }
            const isAvailable = await AuthService.checkUsername(username as string);
            res.json({ success: true, available: isAvailable });
        } catch (err) { next(err); }
    }
}
