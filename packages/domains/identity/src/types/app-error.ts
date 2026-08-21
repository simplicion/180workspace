/**
 * Application-level error with HTTP status codes and extensible metadata.
 * Replaces ad-hoc `err.status = N` patterns across the codebase.
 */
export class AppError extends Error {
    public readonly status: number;
    public readonly code?: string;
    public readonly metadata: Record<string, any>;

    constructor(
        message: string,
        status: number = 500,
        metadata: Record<string, any> = {}
    ) {
        super(message);
        this.name = 'AppError';
        this.status = status;
        this.metadata = metadata;

        // Maintains proper stack trace in V8
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AppError);
        }
    }

    /**
     * Factory for common HTTP error patterns
     */
    static badRequest(message: string, metadata?: Record<string, any>) {
        return new AppError(message, 400, metadata);
    }

    static unauthorized(message: string, metadata?: Record<string, any>) {
        return new AppError(message, 401, metadata);
    }

    static forbidden(message: string, metadata?: Record<string, any>) {
        return new AppError(message, 403, metadata);
    }

    static notFound(message: string, metadata?: Record<string, any>) {
        return new AppError(message, 404, metadata);
    }

    static conflict(message: string, metadata?: Record<string, any>) {
        return new AppError(message, 409, metadata);
    }

    static tooMany(message: string, metadata?: Record<string, any>) {
        return new AppError(message, 429, metadata);
    }

    static internal(message: string, metadata?: Record<string, any>) {
        return new AppError(message, 500, metadata);
    }
}
