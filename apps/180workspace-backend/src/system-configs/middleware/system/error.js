'use strict';

const crypto = require('crypto');
const Sentry = require('../../config/sentry');

/**
 * Global Express error handler.
 * MUST be last middleware registered in server.js (after Sentry).
 *
 * Production principles:
 * 1. Never expose raw error messages, stack traces, or internal details to clients.
 * 2. Always log server-side for observability.
 * 3. Include a correlation ID so users can reference errors to support.
 * 4. Standardized response shape: { error, statusCode, correlationId }.
 */
function errorHandler(err, req, res, next) {
    const correlationId = crypto.randomUUID();
    const isProduction = process.env.NODE_ENV === 'production';

    // Always log server-side (structured for log aggregation)
    if (!isProduction) {
        console.error('[ErrorHandler]', err);
    } else {
        // In production, log essential details without leaking to client
        console.error(JSON.stringify({
            level: 'error',
            correlationId,
            method: req.method,
            path: req.originalUrl,
            status: err.status || err.statusCode || 500,
            message: err.message,
            code: err.code,
            userId: req.user?.id,
            companyId: req.user?.companyId,
            timestamp: new Date().toISOString(),
        }));
    }

    // Capture unhandled errors in Sentry (skip auth errors which are expected)
    if (process.env.SENTRY_DSN && err.status !== 401 && err.status !== 403) {
        Sentry.captureException(err, {
            extra: { correlationId, path: req.originalUrl }
        });
    }

    // --- Known error type handlers (safe, user-friendly messages) ---

    // Prisma duplicate key (P2002)
    if (err.code === 'P2002') {
        const target = err.meta?.target || ['field'];
        return res.status(409).json({
            error: `This ${target.join(', ')} is already in use. Please try another one.`,
            statusCode: 409,
            correlationId
        });
    }

    // Prisma record not found (P2025)
    if (err.code === 'P2025') {
        return res.status(400).json({
            error: "We couldn't find what you were looking for. The provided ID is invalid or does not exist.",
            statusCode: 400,
            correlationId
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: 'Your session is invalid. Please sign in again.',
            statusCode: 401,
            correlationId
        });
    }
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            error: 'Your session has expired. Please sign in again.',
            statusCode: 401,
            correlationId
        });
    }

    // Multer file size error
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            error: 'This file is too large. Please upload a file smaller than 5MB.',
            statusCode: 400,
            correlationId
        });
    }

    // --- Generic error response ---
    const status = err.status || err.statusCode || 500;

    let message;
    if (status >= 500) {
        // NEVER leak internal error messages to clients in production
        message = isProduction
            ? 'An unexpected error occurred on our end. Please try again in a few moments.'
            : err.message || 'Internal Server Error';
    } else {
        // 4xx errors: use the error message (these are typically intentional/controlled)
        message = err.message || 'An error occurred. Please try again.';
    }

    const errorResponse = {
        error: message,
        statusCode: status,
        correlationId
    };

    if (err.name === 'ApiError' && err.errors && err.errors.length > 0) {
        errorResponse.details = err.errors;
    }

    res.status(status).json(errorResponse);
}

module.exports = errorHandler;
