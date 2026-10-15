'use strict';

import jwt from 'jsonwebtoken';

const getJwtSecret = (): string => process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET || '';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface WorkspaceSessionPayload {
    userId: string;
    companyId?: string | null;
    email: string;
    role?: string;
    [key: string]: any;
}

export class WorkspaceSessionService {
    /**
     * Mint a platform session token for the user in the company context
     */
    static mintSessionToken(payload: WorkspaceSessionPayload): string {
        const id = payload.id || payload.userId;
        return jwt.sign({ ...payload, id, sub: id, userId: id }, getJwtSecret(), {
            expiresIn: JWT_EXPIRES_IN,
        } as jwt.SignOptions);
    }

    /**
     * Verify a platform session token
     */
    static verifySessionToken(token: string): WorkspaceSessionPayload | null {
        try {
            return jwt.verify(token, getJwtSecret()) as WorkspaceSessionPayload;
        } catch {
            return null;
        }
    }
}
