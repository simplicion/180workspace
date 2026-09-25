/**
 * Centralized user sanitization utility.
 *
 * Industry best practice: define sensitive fields in ONE place.
 * Every controller that returns user data to a client should pass
 * the user object through this function before sending it.
 *
 * This is a DENYLIST approach — fields listed here are always stripped.
 * This is safer than an allowlist for this codebase because:
 *   1. The User model has 60+ fields and changes frequently.
 *   2. An allowlist would silently drop NEW fields that should be visible.
 *   3. A denylist ensures only explicitly-sensitive fields are hidden.
 *
 * IMPORTANT: This must NOT be used inside auth service internals
 * (login, password reset, MFA verification) where these fields are needed.
 */

/** Fields that must NEVER be sent to any API client. */
export const SENSITIVE_FIELDS = [
    'password',
    'mfaSecret',
    'otpCode',
    'otpExpiry',
    'apiKey',
    'refreshTokens',
    'adminPasswordHash',
    '__v',
];

/**
 * The only Company fields a user payload may carry (`user.company` when the row was loaded with `include: { company: true }`).
 * An ALLOW-list, unlike the user denylist above: the Company row holds the tenant admin's password hash, contact details
 * and billing state, none of which a signed-in member needs. These are the fields the clients read
 * (web NextAuth: id/slug/customDomain/isOnboardingComplete; mobile: id/name/logoUrl) plus display branding.
 */
export const PUBLIC_COMPANY_FIELDS = ['id', 'name', 'slug', 'customDomain', 'logoUrl', 'bannerUrl', 'isOnboardingComplete', 'currency', 'currencySymbol'];

/** Keys stripped at ANY depth, whatever relation they arrive through (e.g. `adminPasswordHash`, `mfaSecret`, `clientSecret`). */
const SENSITIVE_KEY = /(hash|secret|password)$/i;

export function sanitizeCompany(company: any): any {
    if (!company || typeof company !== 'object') return company;
    const safe: Record<string, any> = {};
    for (const field of PUBLIC_COMPANY_FIELDS) {
        if (company[field] !== undefined) safe[field] = company[field];
    }
    return safe;
}

const isPlainObject = (v: any) => v !== null && typeof v === 'object' && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);

function scrubNested(value: any, depth: number): any {
    if (depth > 4) return value;
    if (Array.isArray(value)) return value.map((v) => scrubNested(v, depth + 1));
    if (!isPlainObject(value)) return value;
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
        if (SENSITIVE_KEY.test(k) || SENSITIVE_FIELDS.includes(k)) continue;
        out[k] = scrubNested(v, depth + 1);
    }
    return out;
}

/**
 * Strips sensitive fields from a user object.
 * Works on plain objects and Prisma model instances.
 *
 * @param user - The raw user object (from Prisma or req.user)
 * @returns A copy with sensitive fields removed, nested relations scrubbed and `company` reduced to PUBLIC_COMPANY_FIELDS
 */
export function sanitizeUser(user: any): any {
    if (!user) return user;

    // Create a shallow copy to avoid mutating the original
    const sanitized = scrubNested({ ...user }, 0);

    for (const field of SENSITIVE_FIELDS) {
        delete sanitized[field];
    }
    if (sanitized.company && typeof sanitized.company === 'object') {
        sanitized.company = sanitizeCompany(user.company);
    }

    return sanitized;
}

/**
 * Strips sensitive fields from an array of user objects.
 *
 * @param users - Array of raw user objects
 * @returns Array of sanitized user objects
 */
export function sanitizeUsers(users: any[]): any[] {
    if (!Array.isArray(users)) return users;
    return users.map(sanitizeUser);
}
