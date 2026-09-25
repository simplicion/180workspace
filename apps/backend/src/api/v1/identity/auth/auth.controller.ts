import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@workspace/identity';
import { logAction } from '../../../../system-configs/utils/audit';
import { sanitizeUser } from '../../../../system-configs/utils/sanitize-user';
import { signRefreshToken } from '../../../../system-configs/middleware/auth/auth';
import { computeEntitlements } from '../../platform-billing/entitlements';
import {
    isRefreshTokenRevoked, revokeRefreshToken, rotateRefreshToken, verifyRefreshToken,
    RefreshClaims, RefreshConfigError, RevocationUnavailable, REFRESH_REUSED, REFRESH_REVOKED,
} from './refresh-revocation';
import { clearDevicePushOnLogout, DEVICE_HEADER, NATIVE_DEVICE_HEADER, verifyDeviceToken } from '../../desktop/desktop-device';

/** Access-token lifetime in seconds, so native clients can refresh proactively. Mirrors signAccessToken. */
const accessTokenTtlSeconds = () => Number(process.env.ACCESS_TOKEN_EXPIRE_MINUTES || 15) * 60;

/** Missing JWT_REFRESH_SECRET is a deployment error: logged and reported as 500, never as "your token is invalid". */
const refreshConfigFailure = (res: Response, err: Error) => {
    console.error('[Auth]', err.message);
    return res.status(500).json({ error: 'Server configuration error: sessions cannot be verified.', code: 'AUTH_CONFIG_ERROR' });
};

/**
 * The native device signing out, if the client said which one: `deviceId` in the body, or its device token header.
 * Only ever resolved within the company + user proven by the refresh token.
 */
function logoutDeviceId(req: Request, owner: { userId: string; companyId: string }): string | null {
    if (typeof req.body?.deviceId === 'string' && req.body.deviceId) return req.body.deviceId;
    const raw = req.headers[NATIVE_DEVICE_HEADER] || req.headers[DEVICE_HEADER];
    const token = Array.isArray(raw) ? raw[0] : raw;
    if (!token) return null;
    try {
        const claims = verifyDeviceToken(token);
        return claims.userId === owner.userId && claims.companyId === owner.companyId ? claims.deviceId : null;
    } catch {
        return null;
    }
}

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
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
                tokenType: 'Bearer',
                expiresIn: accessTokenTtlSeconds(),
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

    /**
     * Revokes the presented refresh token's whole session family (every token rotated from that sign-in), and clears the
     * push token of the native device signing out. Access tokens are short-lived JWTs and simply expire.
     * Without a refresh token there is nothing server-side to revoke (the web keeps its token in the NextAuth session).
     */
    static async logout(req: Request, res: Response, next: NextFunction) {
        try {
            const refreshToken = req.body?.refreshToken;
            if (!refreshToken) {
                return res.json({ message: 'Logged out successfully', refreshTokenRevoked: false });
            }
            let owner: { userId: string; companyId: string };
            try {
                owner = await revokeRefreshToken(String(refreshToken));
            } catch (err: any) {
                if (err instanceof RefreshConfigError) return refreshConfigFailure(res, err);
                if (err instanceof RevocationUnavailable) {
                    console.error('[Auth] logout could not revoke refresh token:', err.message);
                    return res.status(503).json({ error: 'Could not complete sign-out on the server. Please try again.' });
                }
                // Invalid or expired token: it is already unusable, so the session is over either way.
                return res.json({ message: 'Logged out successfully', refreshTokenRevoked: false, reason: 'token_invalid_or_expired' });
            }
            const deviceId = logoutDeviceId(req, owner);
            if (deviceId) {
                try {
                    await clearDevicePushOnLogout({ ...owner, deviceId });
                } catch (err: any) {
                    // The session is already revoked; a registry blip must not fail the sign-out.
                    console.error('[Auth] logout could not clear the device push token:', err?.message);
                }
            }
            res.json({ message: 'Logged out successfully', refreshTokenRevoked: true });
        } catch (err) { next(err); }
    }

    /**
     * Rotation: the presented refresh token is consumed and a new one in the same session family is returned. Presenting
     * an already-consumed token again (outside a short grace window for concurrent tabs / lost responses) revokes the
     * whole family - see refresh-revocation.ts.
     */
    static async refreshToken(req: Request, res: Response, next: NextFunction) {
        try {
            const presented = req.body?.refreshToken ? String(req.body.refreshToken) : '';
            let claims: RefreshClaims | null = null;
            if (presented) {
                try {
                    claims = verifyRefreshToken(presented);
                } catch (err: any) {
                    if (err instanceof RefreshConfigError) return refreshConfigFailure(res, err);
                    // Invalid / expired: AuthService.refreshToken rejects it below with its usual 401.
                }
            }
            if (presented && await isRefreshTokenRevoked(presented, claims)) {
                return res.status(401).json({ error: 'Your session has ended. Please sign in again.', code: REFRESH_REVOKED });
            }
            const result = await AuthService.refreshToken(presented);
            if (!result.user.isActive) {
                return res.status(401).json({ error: 'Your account has been deactivated. Please contact your administrator.' });
            }
            if (result.user.companyId && String(result.user.companyId) !== String(result.company.id)) {
                return res.status(401).json({ error: 'Your session is invalid. Please sign in again.' });
            }
            if (!claims) return res.status(401).json({ error: 'Invalid or expired refresh token' });
            // Consumed only now, after every other check passed, so a transient failure above does not burn the token.
            const rotation = await rotateRefreshToken(presented, claims);
            if (rotation.ok === false) {
                return res.status(401).json({ error: 'Your session has ended. Please sign in again.', code: REFRESH_REUSED });
            }
            (req as any).user = result.user;
            (req as any).company = result.company;
            res.json({
                token: result.token,
                accessToken: result.token,
                refreshToken: signRefreshToken(result.user.id, result.company.id, rotation.familyId),
                tokenType: 'Bearer',
                expiresIn: accessTokenTtlSeconds(),
            });
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

            // Same entitlement answer the web derives from /api/billing + /api/feature-flags, for the caller's own company.
            const companyId = reqUser.companyId || reqCompany?.id;
            const entitlements = companyId ? await computeEntitlements(String(companyId)) : null;

            res.json({
                user: sanitizedUser,
                role: (sanitizedUser as any)?.role || null,
                permissions: (sanitizedUser as any)?.permissions || [],
                entitlements,
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
            // Native Google Sign-In SDKs hand back an `idToken`; the web sends `tokenId`. Accept both.
            const tokenId = req.body?.tokenId || req.body?.idToken;
            const result = await AuthService.googleLogin({ ...req.body, tokenId });

            let metadata: any = {};
            if (result.company.metadata) {
                try {
                    metadata = typeof result.company.metadata === 'string' ? JSON.parse(result.company.metadata) : result.company.metadata;
                } catch(e) {}
            }

            res.json({
                token: result.token,
                accessToken: result.token,
                refreshToken: result.refreshToken,
                tokenType: 'Bearer',
                expiresIn: accessTokenTtlSeconds(),
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
