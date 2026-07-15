'use strict';

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
const SENSITIVE_FIELDS = [
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
 * Strips sensitive fields from a user object.
 * Works on plain objects and Prisma model instances.
 *
 * @param {Object} user - The raw user object (from Prisma or req.user)
 * @returns {Object} A shallow copy with sensitive fields removed
 */
function sanitizeUser(user) {
    if (!user) return user;

    // Create a shallow copy to avoid mutating the original
    const sanitized = { ...user };

    for (const field of SENSITIVE_FIELDS) {
        delete sanitized[field];
    }

    return sanitized;
}

/**
 * Strips sensitive fields from an array of user objects.
 *
 * @param {Object[]} users - Array of raw user objects
 * @returns {Object[]} Array of sanitized user objects
 */
function sanitizeUsers(users) {
    if (!Array.isArray(users)) return users;
    return users.map(sanitizeUser);
}

module.exports = { sanitizeUser, sanitizeUsers, SENSITIVE_FIELDS };
