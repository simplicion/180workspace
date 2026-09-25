import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { redis } from '../../../../system-configs/config/redis';

/**
 * Server-side state for refresh tokens (they are stateless JWTs, so logout and rotation cannot otherwise invalidate them).
 *
 * Rotation with reuse detection:
 *   - Every refresh token carries a session family id (`sid`). Login starts a family; each refresh consumes the presented
 *     token and issues a new one in the SAME family.
 *   - A consumed token presented again after a short grace window is a replay (the token leaked, or an attacker raced the
 *     real client): the whole family is revoked, which ends the session on every holder, attacker and user alike.
 *   - The grace window (REFRESH_TOKEN_REUSE_GRACE_SECONDS, default 30) covers legitimate near-simultaneous use of one token:
 *     two browser tabs refreshing at once from shared localStorage, or a client retrying after the response was lost.
 *   - Logout revokes the family, so every token ever rotated from that sign-in stops working.
 *   - Tokens issued before families existed (no `sid`) are accepted once; the rotated token starts a new family.
 *
 * Stored in Redis (process memory outside production when Redis is down). Keys are sha256 of the token, TTL = the token's remaining lifetime (family keys: the full refresh lifetime).
 */

const hash = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
/** Pre-family logout revocation of one specific token (kept so tokens revoked before this change stay revoked). */
const revokedKey = (token: string) => `auth:revoked-refresh:v1:${hash(token)}`;
/** Set when a token is consumed by a refresh; value `${rotatedAtMs}:${familyId}`. */
const usedKey = (token: string) => `auth:used-refresh:v1:${hash(token)}`;
const familyKey = (familyId: string) => `auth:revoked-refresh-family:v1:${familyId}`;

export class RevocationUnavailable extends Error {}
/** The server cannot verify refresh tokens because JWT_REFRESH_SECRET is not configured. A deployment error, never the caller's. */
export class RefreshConfigError extends Error {}

export const REFRESH_REVOKED = 'REFRESH_TOKEN_REVOKED';
export const REFRESH_REUSED = 'REFRESH_TOKEN_REUSED';

export function refreshSecret(): string {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
        console.error('[Auth] ERROR: JWT_REFRESH_SECRET is missing from environment variables!');
        throw new RefreshConfigError('Server configuration error: missing JWT refresh secret');
    }
    return secret;
}

const refreshLifetimeSeconds = () => Number(process.env.REFRESH_TOKEN_EXPIRE_DAYS || 7) * 24 * 60 * 60;
const reuseGraceMs = () => {
    const v = Number(process.env.REFRESH_TOKEN_REUSE_GRACE_SECONDS);
    return (Number.isFinite(v) && v >= 0 ? v : 30) * 1000;
};

export const newFamilyId = () => crypto.randomUUID();

// ── store: Redis; process memory only outside production (same policy as the desktop device registry) ──────────

const memory = new Map<string, { value: string; expiresAt: number }>();
const memGet = (k: string) => {
    const e = memory.get(k);
    if (!e) return null;
    if (e.expiresAt <= Date.now()) {
        memory.delete(k);
        return null;
    }
    return e.value;
};

async function withStore<T>(redisOp: () => Promise<T>, memoryOp: () => T): Promise<T> {
    if (redis) {
        try {
            return await redisOp();
        } catch (err) {
            if (process.env.NODE_ENV === 'production') throw new RevocationUnavailable((err as Error).message);
        }
    } else if (process.env.NODE_ENV === 'production') {
        throw new RevocationUnavailable('Redis is not configured');
    }
    return memoryOp();
}

/** SET key value EX ttl [NX]. Returns false only when NX was requested and the key already existed. */
const storeSet = (k: string, value: string, ttlSeconds: number, nx = false) =>
    withStore(
        async () => (nx ? await redis!.set(k, value, 'EX', ttlSeconds, 'NX') : await redis!.set(k, value, 'EX', ttlSeconds)) === 'OK',
        () => {
            if (nx && memGet(k) !== null) return false;
            memory.set(k, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
            return true;
        }
    );
const storeGet = (k: string) => withStore(async () => redis!.get(k), () => memGet(k));
const storeExists = (keys: string[]) =>
    withStore(async () => redis!.exists(...keys), () => keys.filter((k) => memGet(k) !== null).length);

export interface RefreshClaims {
    userId: string;
    companyId: string;
    /** Session family; null for tokens issued before rotation existed. */
    familyId: string | null;
    exp: number;
}

/** Verifies signature + expiry. Throws RefreshConfigError when the secret is missing, jwt errors for a bad token. */
export function verifyRefreshToken(token: string): RefreshClaims {
    const decoded = jwt.verify(token, refreshSecret()) as jwt.JwtPayload;
    return {
        userId: String(decoded.id),
        companyId: String(decoded.companyId),
        familyId: typeof decoded.sid === 'string' && decoded.sid ? decoded.sid : null,
        exp: decoded.exp || 0,
    };
}

const remainingTtl = (claims: RefreshClaims) => Math.max(1, claims.exp - Math.floor(Date.now() / 1000));

async function revokeFamily(familyId: string) {
    await storeSet(familyKey(familyId), '1', refreshLifetimeSeconds());
}

/**
 * Logout: revokes the token's whole session family (and the token itself, for pre-family tokens and any family a
 * pre-family token was rotated into). Returns the token's user/company.
 */
export async function revokeRefreshToken(token: string): Promise<{ userId: string; companyId: string; familyId: string | null }> {
    const claims = verifyRefreshToken(token);
    await storeSet(revokedKey(token), '1', remainingTtl(claims));
    if (claims.familyId) await revokeFamily(claims.familyId);
    // A pre-family token that was already rotated: its descendants live in the family recorded at rotation.
    const used = await storeGet(usedKey(token));
    const rotatedInto = used ? used.split(':')[1] : null;
    if (rotatedInto && rotatedInto !== claims.familyId) await revokeFamily(rotatedInto);
    return { userId: claims.userId, companyId: claims.companyId, familyId: claims.familyId };
}

/**
 * Read-only check before a refresh: true when the token (or its family) was revoked by a logout or a reuse detection.
 * A Redis outage fails OPEN (logged): the token's signature and expiry are still enforced, and taking every session
 * down on a cache blip is worse than a short revocation gap.
 */
export async function isRefreshTokenRevoked(token: string, claims?: RefreshClaims | null): Promise<boolean> {
    try {
        const keys = [revokedKey(token)];
        if (claims?.familyId) keys.push(familyKey(claims.familyId));
        return (await storeExists(keys)) > 0;
    } catch (err: any) {
        console.error('[Auth] refresh revocation check unavailable:', err?.message);
        return false;
    }
}

export type RotationResult = { ok: true; familyId: string } | { ok: false; code: typeof REFRESH_REUSED };

/**
 * Consumes `token` for one refresh. Call it AFTER every other check passed (so a transient failure elsewhere does not
 * burn the token). Returns the family the new token must be issued in, or REUSED when the token had already been
 * consumed outside the grace window (the family is then revoked).
 */
export async function rotateRefreshToken(token: string, claims: RefreshClaims): Promise<RotationResult> {
    const familyId = claims.familyId || newFamilyId();
    try {
        if (await storeSet(usedKey(token), `${Date.now()}:${familyId}`, remainingTtl(claims), true)) return { ok: true, familyId };

        const used = await storeGet(usedKey(token));
        const [atRaw, usedFamily] = (used || '').split(':');
        const family = usedFamily || familyId;
        if (Date.now() - Number(atRaw) <= reuseGraceMs()) return { ok: true, familyId: family };

        await revokeFamily(family);
        console.warn(`[Auth] refresh token reuse detected for user=${claims.userId}; session family revoked`);
        return { ok: false, code: REFRESH_REUSED };
    } catch (err: any) {
        // Same fail-open policy as the revocation check: signature and expiry were verified by the caller.
        console.error('[Auth] refresh rotation state unavailable:', err?.message);
        return { ok: true, familyId };
    }
}
