import { PlatformAuthRepository } from '../repositories/platform-auth.repository';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

const signToken = (admin: any) => jwt.sign(
    { id: admin.id, role: 'superadmin', email: admin.email },
    process.env.SUPER_ADMIN_JWT_SECRET as string,
    { expiresIn: process.env.SUPER_ADMIN_JWT_EXPIRES_IN || '8h' } as jwt.SignOptions
);

const toSafeObject = (admin: any) => {
    const { passwordHash, ...safeAdmin } = admin;
    return safeAdmin;
};

export class PlatformAuthService {
    static async login(email: string, password: string) {
        if (!email || !password) throw new Error('Email and password required');
        
        const admin = await PlatformAuthRepository.findByEmail(email);
        
        if (!admin) throw new Error('Invalid credentials');
        
        const valid = await bcrypt.compare(password, admin.passwordHash);
        if (!valid) throw new Error('Invalid credentials');
        
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
