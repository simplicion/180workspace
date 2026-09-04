import jwt from 'jsonwebtoken';
import { prisma } from '@workspace/db';
import { Request, Response, NextFunction } from 'express';

export default async function superAdminAuth(req: any, res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Super admin authentication required' });
        }
        const token = authHeader.split(' ')[1];
        const secret = process.env.SUPER_ADMIN_JWT_SECRET;
        if (!secret) {
            return res.status(500).json({ error: 'Super admin JWT secret not configured' });
        }
        let decoded: any;
        try {
            decoded = jwt.verify(token, secret);
        } catch {
            return res.status(401).json({ error: 'Invalid or expired super admin token' });
        }
        if (decoded.role !== 'superadmin') {
            return res.status(403).json({ error: 'Access denied. Super admin only.' });
        }
        const admin = await prisma.superAdmin.findUnique({
            where: { id: decoded.id },
            select: { id: true, email: true, name: true, role: true } // Exclude passwordHash
        });
        if (!admin) {
            return res.status(401).json({ error: 'Super admin account not found' });
        }
        req.superAdmin = admin;
        next();
    } catch (err) {
        console.error('superAdminAuth error:', err);
        res.status(500).json({ error: 'Authentication error' });
    }
};
