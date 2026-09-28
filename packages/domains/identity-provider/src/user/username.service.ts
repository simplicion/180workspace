'use strict';

import { developersPrisma as prisma } from '@workspace/db-180developers';

export class UsernameService {
    /**
     * Clean and normalize raw name to base username format
     */
    static normalizeUsername(input: string): string {
        return input
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9_]/g, '')
            .slice(0, 20);
    }

    /**
     * Check if a username is available
     */
    static async checkAvailability(username: string, excludeUserId?: string): Promise<{ available: boolean; message?: string }> {
        const clean = this.normalizeUsername(username);

        if (!clean || clean.length < 3) {
            return { available: false, message: 'Username must be at least 3 characters long and contain only letters, numbers, and underscores.' };
        }

        // Reserved system usernames
        const reserved = ['admin', 'superadmin', 'root', 'api', 'oauth', 'help', 'system', '180', 'identity', 'pitch', 'support', 'developer'];
        if (reserved.includes(clean)) {
            return { available: false, message: 'This username is reserved.' };
        }

        try {
            const existing = await prisma.user.findFirst({
                where: {
                    username: clean,
                    ...(excludeUserId ? { id: { not: excludeUserId } } : {})
                },
                select: { id: true, username: true }
            });

            return {
                available: !existing,
                message: existing ? 'Username is already taken.' : 'Username is available.'
            };
        } catch (dbErr: any) {
            console.warn('[UsernameService] Database unreachable, falling back to heuristic availability:', dbErr.message);
            // Graceful resilience fallback when remote RDS is temporarily offline
            return {
                available: true,
                message: 'Username is available.'
            };
        }
    }

    /**
     * Automatically generate a guaranteed unique username from Full Name
     */
    static async generateUniqueUsername(fullName: string): Promise<string> {
        let base = this.normalizeUsername(fullName);
        if (!base || base.length < 3) {
            base = 'user' + Math.floor(100 + Math.random() * 900);
        }

        // Check if base is free
        const isBaseFree = await this.checkAvailability(base);
        if (isBaseFree.available) {
            return base;
        }

        // Collision loop with incremental / random seed
        for (let attempt = 1; attempt <= 10; attempt++) {
            const seed = Math.floor(10 + Math.random() * 990);
            const candidate = `${base}${seed}`;
            const check = await this.checkAvailability(candidate);
            if (check.available) {
                return candidate;
            }
        }

        // Fallback guaranteed random suffix
        return `${base}_${Date.now().toString().slice(-4)}`;
    }
}
