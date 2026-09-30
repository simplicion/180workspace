'use strict';

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { developersPrisma as prisma } from '@workspace/db-180core';

export function verifyJwtToken(token: string): any {
  const secrets = [
    process.env.JWT_SECRET,
    process.env.JWT_ACCESS_SECRET,
    '195ee7cdf2272463be82f5d065eaf1dc52992c6d5c05241e7cde005eb2cbc71b',
    '180-identity-jwt-secret-key-prod-super-secure'
  ].filter(Boolean) as string[];

  for (const secret of secrets) {
    try {
      return jwt.verify(token, secret);
    } catch (_) {}
  }
  return null;
}

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

    // 3. Verify JWT or OAuth Token
    let userId: string | null = null;
    const decoded = verifyJwtToken(token) as any;
    if (decoded) {
      userId = decoded.id || decoded.sub || decoded.userId || null;
    } else {
      // Check if it's an OAuth access token stored in database
      const dbToken = await prisma.oAuthToken.findUnique({
        where: { accessToken: token },
        select: { userId: true, expiresAt: true, revokedAt: true },
      });
      if (dbToken && !dbToken.revokedAt && dbToken.expiresAt > new Date()) {
        userId = dbToken.userId;
      }
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session token',
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
        isVerified: true,
        isOnboarded: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User account not found',
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
    const decoded = verifyJwtToken(token) as any;
    if (decoded) {
      (req as any).user = { id: decoded.id || decoded.sub || decoded.userId };
    }
  } catch (e) {}

  next();
}
