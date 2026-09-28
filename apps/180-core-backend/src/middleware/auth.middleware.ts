'use strict';

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { developersPrisma as prisma } from '@workspace/db-180developers';

const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET || '180-identity-jwt-secret-key-prod-super-secure';

export async function protect(req: Request, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;

    // 1. Check Bearer Authorization Header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    // 2. Check Cookie
    if (!token && (req as any).cookies?.platform_auth_token) {
      token = (req as any).cookies.platform_auth_token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication token required',
      });
    }

    // 3. Verify JWT
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userId = decoded.id || decoded.sub || decoded.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token payload',
      });
    }

    // 4. Fetch User
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        username: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'User account not found or inactive',
      });
    }

    (req as any).user = user;
    next();
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired session token',
    });
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).user = { id: decoded.id || decoded.sub || decoded.userId };
  } catch (e) {}

  next();
}
