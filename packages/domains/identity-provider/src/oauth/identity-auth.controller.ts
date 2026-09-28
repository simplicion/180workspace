'use strict';

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { developersPrisma as prisma } from '@workspace/db-180developers';
import { Msg91OtpService } from '../otp/msg91-otp.service';
import { UsernameService } from '../user/username.service';
import { LocationService } from '../user/location.service';

const JWT_SECRET = process.env.JWT_SECRET || 'jwt-secret-key-super-secure';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function signToken(userId: string, companyId: string = ''): string {
    return jwt.sign(
        { id: userId, companyId },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
    );
}

export class IdentityAuthController {
    /**
     * 1. Inline Login for 180 Identity Modal (Email or Phone + Password)
     */
    static async login(req: any, res: any) {
        try {
            const { emailOrPhone, password } = req.body;
            if (!emailOrPhone || !password) {
                return res.status(400).json({ error: 'invalid_credentials', message: 'Email/Phone and password are required' });
            }

            const cleanInput = String(emailOrPhone).trim();
            const isEmail = cleanInput.includes('@');

            const user = await prisma.user.findFirst({
                where: isEmail
                    ? { email: { equals: cleanInput, mode: 'insensitive' } }
                    : { phone: cleanInput }
            });

            if (!user) {
                return res.status(401).json({ error: 'user_not_found', message: 'No account found with this credential' });
            }

            const passwordToCompare = user.password || user.passwordHash || '';
            const isMatch = await bcrypt.compare(password, passwordToCompare);

            if (!isMatch) {
                return res.status(401).json({ error: 'invalid_password', message: 'Invalid password. Please try again or reset it.' });
            }

            const token = signToken(user.id, user.companyId || '');

            return res.json({
                success: true,
                token,
                user: {
                    id: user.id,
                    name: user.name || '',
                    username: user.username || '',
                    email: user.email,
                    phone: user.phone || null,
                    photoUrl: user.photoUrl || user.image || '',
                    companyId: user.companyId || null
                }
            });
        } catch (err: any) {
            console.error('[IdentityAuthController] login error:', err);
            return res.status(500).json({ error: 'server_error', message: err.message });
        }
    }

    /**
     * 2. Self-Contained Profile Registration for 180 Identity
     */
    static async register(req: any, res: any) {
        try {
            const {
                name,
                email,
                phone,
                password,
                username,
                latitude,
                longitude,
                city,
                country,
                headline
            } = req.body;

            if (!name || (!email && !phone) || !password) {
                return res.status(400).json({
                    error: 'missing_fields',
                    message: 'Full name, email/phone, and password are required'
                });
            }

            // Check email uniqueness if email provided
            if (email) {
                const existingEmail = await prisma.user.findFirst({
                    where: { email: { equals: String(email).trim(), mode: 'insensitive' } },
                    select: { id: true }
                });
                if (existingEmail) {
                    return res.status(409).json({ error: 'email_taken', message: 'An account with this email already exists' });
                }
            }

            // Check phone uniqueness if phone provided
            if (phone) {
                const existingPhone = await prisma.user.findFirst({
                    where: { phone: String(phone).trim() },
                    select: { id: true }
                });
                if (existingPhone) {
                    return res.status(409).json({ error: 'phone_taken', message: 'An account with this phone number already exists' });
                }
            }

            // Guarantee unique username
            let finalUsername = username ? UsernameService.normalizeUsername(username) : '';
            if (!finalUsername || finalUsername.length < 3) {
                finalUsername = await UsernameService.generateUniqueUsername(name);
            } else {
                const avail = await UsernameService.checkAvailability(finalUsername);
                if (!avail.available) {
                    finalUsername = await UsernameService.generateUniqueUsername(name);
                }
            }

            // Resolve location if coordinates provided but city/country missing
            let resolvedCity = city || '';
            let resolvedCountry = country || '';
            if (latitude !== undefined && longitude !== undefined && (!resolvedCity || !resolvedCountry)) {
                try {
                    const loc = await LocationService.resolveCoordinates(Number(latitude), Number(longitude));
                    resolvedCity = resolvedCity || loc.city;
                    resolvedCountry = resolvedCountry || loc.country;
                } catch (e) {}
            }

            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Create global User
            const user = await prisma.user.create({
                data: {
                    name: String(name).trim(),
                    email: email ? String(email).trim().toLowerCase() : `${finalUsername}@180identity.internal`,
                    phone: phone ? String(phone).trim() : null,
                    username: finalUsername,
                    password: hashedPassword,
                    passwordHash: hashedPassword,
                    latitude: latitude !== undefined ? Number(latitude) : null,
                    longitude: longitude !== undefined ? Number(longitude) : null,
                    city: resolvedCity || null,
                    country: resolvedCountry || null,
                    headline: headline || null,
                    emailVerified: Boolean(email),
                    role: 'USER',
                    isActive: true,
                    isOnboardingComplete: false // Workspace onboarding pending
                }
            });

            const token = signToken(user.id, '');

            return res.status(201).json({
                success: true,
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    username: user.username,
                    email: user.email,
                    phone: user.phone,
                    photoUrl: user.photoUrl || user.image || '',
                    companyId: null
                }
            });
        } catch (err: any) {
            console.error('[IdentityAuthController] register error:', err);
            return res.status(500).json({ error: 'server_error', message: err.message });
        }
    }

    /**
     * 3. Forgot Password - OTP Dispatch (WhatsApp or Email)
     */
    static async forgotPassword(req: any, res: any) {
        try {
            const { emailOrPhone } = req.body;
            if (!emailOrPhone) {
                return res.status(400).json({ error: 'missing_field', message: 'Email or phone number is required' });
            }

            const cleanInput = String(emailOrPhone).trim();
            const isEmail = cleanInput.includes('@');

            const user = await prisma.user.findFirst({
                where: isEmail
                    ? { email: { equals: cleanInput, mode: 'insensitive' } }
                    : { phone: cleanInput }
            });

            if (!user) {
                // Return generic success to avoid credential enumeration
                return res.json({
                    success: true,
                    message: 'If an account exists, a verification code has been dispatched.'
                });
            }

            // Generate 6-digit OTP code
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

            await prisma.user.update({
                where: { id: user.id },
                data: { otpCode, otpExpiry }
            });

            if (!isEmail && user.phone) {
                await Msg91OtpService.sendWhatsAppOtp(user.phone);
            }

            return res.json({
                success: true,
                channel: isEmail ? 'email' : 'whatsapp',
                message: process.env.NODE_ENV === 'production'
                    ? 'Verification code dispatched'
                    : `Code dispatched (DEV OTP: ${otpCode})`
            });
        } catch (err: any) {
            console.error('[IdentityAuthController] forgotPassword error:', err);
            return res.status(500).json({ error: 'server_error', message: err.message });
        }
    }

    /**
     * 4. Reset Password with OTP Code
     */
    static async resetPassword(req: any, res: any) {
        try {
            const { emailOrPhone, otp, newPassword } = req.body;
            if (!emailOrPhone || !otp || !newPassword) {
                return res.status(400).json({ error: 'missing_fields', message: 'Credentials, OTP, and new password are required' });
            }

            const cleanInput = String(emailOrPhone).trim();
            const isEmail = cleanInput.includes('@');

            const user = await prisma.user.findFirst({
                where: isEmail
                    ? { email: { equals: cleanInput, mode: 'insensitive' } }
                    : { phone: cleanInput }
            });

            if (!user) {
                return res.status(404).json({ error: 'not_found', message: 'Account not found' });
            }

            // Verify OTP
            let isValidOtp = false;
            if (user.otpCode === String(otp).trim() && user.otpExpiry && user.otpExpiry > new Date()) {
                isValidOtp = true;
            } else if (!isEmail && user.phone) {
                const whatsappVerify = await Msg91OtpService.verifyWhatsAppOtp(user.phone, String(otp).trim());
                isValidOtp = whatsappVerify.valid;
            }

            if (!isValidOtp) {
                return res.status(400).json({ error: 'invalid_otp', message: 'Invalid or expired verification code' });
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);

            const updatedUser = await prisma.user.update({
                where: { id: user.id },
                data: {
                    password: hashedPassword,
                    passwordHash: hashedPassword,
                    otpCode: null,
                    otpExpiry: null
                }
            });

            const token = signToken(updatedUser.id, updatedUser.companyId || '');

            return res.json({
                success: true,
                message: 'Password reset successfully',
                token,
                user: {
                    id: updatedUser.id,
                    name: updatedUser.name,
                    username: updatedUser.username,
                    email: updatedUser.email,
                    phone: updatedUser.phone
                }
            });
        } catch (err: any) {
            console.error('[IdentityAuthController] resetPassword error:', err);
            return res.status(500).json({ error: 'server_error', message: err.message });
        }
    }

    /**
     * 5. Google Continuation: Complete setup with custom username, fallback password & location
     */
    static async googleContinue(req: any, res: any) {
        try {
            const {
                tokenId,
                username,
                password,
                latitude,
                longitude,
                city,
                country,
                email: manualEmail,
                name: manualName,
                avatar: manualAvatar
            } = req.body;

            let googleEmail = manualEmail;
            let googleName = manualName;
            let googleAvatar = manualAvatar;

            if (tokenId) {
                try {
                    const decoded: any = jwt.decode(tokenId);
                    if (decoded) {
                        googleEmail = decoded.email || googleEmail;
                        googleName = decoded.name || googleName;
                        googleAvatar = decoded.picture || googleAvatar;
                    }
                } catch (e) {}
            }

            if (!googleEmail) {
                return res.status(400).json({ error: 'missing_email', message: 'Google account email could not be resolved' });
            }

            // Normalize and ensure username
            let finalUsername = username ? UsernameService.normalizeUsername(username) : '';
            if (!finalUsername || finalUsername.length < 3) {
                finalUsername = await UsernameService.generateUniqueUsername(googleName || 'user');
            }

            // Location
            let resolvedCity = city || '';
            let resolvedCountry = country || '';
            if (latitude !== undefined && longitude !== undefined && (!resolvedCity || !resolvedCountry)) {
                try {
                    const loc = await LocationService.resolveCoordinates(Number(latitude), Number(longitude));
                    resolvedCity = resolvedCity || loc.city;
                    resolvedCountry = resolvedCountry || loc.country;
                } catch (e) {}
            }

            let hashedPassword = null;
            if (password) {
                const salt = await bcrypt.genSalt(10);
                hashedPassword = await bcrypt.hash(password, salt);
            }

            // Find or upsert user
            const existing = await prisma.user.findFirst({
                where: { email: { equals: googleEmail, mode: 'insensitive' } }
            });

            let user;
            if (existing) {
                user = await prisma.user.update({
                    where: { id: existing.id },
                    data: {
                        name: existing.name || googleName,
                        username: existing.username || finalUsername,
                        ...(hashedPassword ? { password: hashedPassword, passwordHash: hashedPassword } : {}),
                        photoUrl: existing.photoUrl || existing.image || googleAvatar,
                        latitude: latitude !== undefined ? Number(latitude) : existing.latitude,
                        longitude: longitude !== undefined ? Number(longitude) : existing.longitude,
                        city: resolvedCity || existing.city,
                        country: resolvedCountry || existing.country,
                        emailVerified: true
                    }
                });
            } else {
                user = await prisma.user.create({
                    data: {
                        name: googleName || '180 User',
                        email: googleEmail.toLowerCase(),
                        username: finalUsername,
                        password: hashedPassword || '',
                        passwordHash: hashedPassword || '',
                        photoUrl: googleAvatar || null,
                        image: googleAvatar || null,
                        latitude: latitude !== undefined ? Number(latitude) : null,
                        longitude: longitude !== undefined ? Number(longitude) : null,
                        city: resolvedCity || null,
                        country: resolvedCountry || null,
                        emailVerified: true,
                        role: 'USER',
                        isActive: true,
                        isOnboardingComplete: false
                    }
                });
            }

            const token = signToken(user.id, user.companyId || '');

            return res.json({
                success: true,
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    username: user.username,
                    email: user.email,
                    photoUrl: user.photoUrl || user.image || '',
                    companyId: user.companyId || null
                }
            });
        } catch (err: any) {
            console.error('[IdentityAuthController] googleContinue error:', err);
            return res.status(500).json({ error: 'server_error', message: err.message });
        }
    }
}
