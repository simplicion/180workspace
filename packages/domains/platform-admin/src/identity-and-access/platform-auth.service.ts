import { PlatformAuthRepository } from '../repositories/platform-auth.repository';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

const signToken = (admin: any) => {
    const secret = process.env.SUPER_ADMIN_JWT_SECRET;
    if (!secret) {
        throw new Error('SUPER_ADMIN_JWT_SECRET must be set in the environment — no hardcoded fallback is used.');
    }
    return jwt.sign(
        { id: admin.id, role: 'superadmin', email: admin.email },
        secret,
        { expiresIn: process.env.SUPER_ADMIN_JWT_EXPIRES_IN || '24h' } as jwt.SignOptions
    );
};

const toSafeObject = (admin: any) => {
    const { passwordHash, ...safeAdmin } = admin;
    return safeAdmin;
};

export class PlatformAuthService {
    static async login(email: string, password: string) {
        if (!email || !password) {
            const err: any = new Error('Email and password required');
            err.statusCode = 400;
            throw err;
        }

        const cleanEmail = email.trim().toLowerCase();
        let admin = await PlatformAuthRepository.findByEmail(cleanEmail);
        
        if (!admin) {
            // Auto-provision if it's the registered admin email
            if (cleanEmail === 'simplicion.com@gmail.com' || cleanEmail === (process.env.ADMIN_EMAIL || '').toLowerCase() || cleanEmail === 'admin@180workspace.com') {
                const hash = await bcrypt.hash(password, 12);
                admin = await PlatformAuthRepository.update(
                    cleanEmail,
                    { name: cleanEmail.includes('simplicion') ? 'Simplicion Admin' : 'Super Admin', email: cleanEmail, passwordHash: hash, role: 'superadmin' }
                ).catch(async () => {
                    const { prisma } = require('@workspace/db');
                    return prisma.superAdmin.create({
                        data: {
                            name: cleanEmail.includes('simplicion') ? 'Simplicion Admin' : 'Super Admin',
                            email: cleanEmail,
                            passwordHash: hash,
                            role: 'superadmin'
                        }
                    });
                });
            } else {
                const err: any = new Error('Invalid credentials');
                err.statusCode = 401;
                throw err;
            }
        }
        
        let valid = await bcrypt.compare(password, admin.passwordHash);
        if (!valid) {
            // Check against master admin recovery credentials — both must come from the
            // environment with no hardcoded literal fallback; either one unset simply
            // disables that recovery path instead of falling back to a baked-in secret.
            const masterPw = process.env.ADMIN_PASSWORD;
            const masterPin = process.env.ADMIN_MASTER_PIN;
            if ((masterPw && password === masterPw) || (masterPin && password === masterPin)) {
                valid = true;
                // Automatically update password hash in DB for seamless future bcrypt comparisons
                const updatedHash = await bcrypt.hash(password, 12);
                await PlatformAuthRepository.update(admin.id, { passwordHash: updatedHash }).catch(() => {});
            }
        }

        if (!valid) {
            const err: any = new Error('Invalid credentials');
            err.statusCode = 401;
            throw err;
        }
        
        const token = signToken(admin);
        return { token, superAdmin: toSafeObject(admin) };
    }

    static toSafeObject(admin: any) {
        return toSafeObject(admin);
    }

    static async updateProfile(adminId: string, email: string, name?: string) {
        if (!email) throw new Error('Email is required');

        const existingEmail = await PlatformAuthRepository.findByEmailExcludingId(email, adminId);
        if (existingEmail) throw new Error('Email already in use');

        const updateData: any = { email: email.toLowerCase() };
        if (name) updateData.name = name;

        const updatedAdmin = await PlatformAuthRepository.update(adminId, updateData);

        return toSafeObject(updatedAdmin);
    }

    static async changePassword(adminId: string, currentPassword: string, newPassword: string) {
        if (!newPassword || newPassword.length < 8) {
            throw new Error('New password must be at least 8 characters');
        }
        
        const admin = await PlatformAuthRepository.findById(adminId);
        if (!admin) throw new Error('Admin not found');
        
        const valid = await bcrypt.compare(currentPassword, admin.passwordHash);
        if (!valid) throw new Error('Current password is incorrect');

        const hashedNewPassword = await bcrypt.hash(newPassword, 12);
        
        await PlatformAuthRepository.update(admin.id, { passwordHash: hashedNewPassword });
        
        return true;
    }
}
