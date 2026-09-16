import { ApiError } from '../../utils/ApiError';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to validate incoming request data (body, query, params) against Zod schemas.
 * @param schemas - Object containing Zod schemas for body, query, and/or params.
 * @example
 * validateRequest({ body: userSchema, query: querySchema })
 */
const validateRequest = (schemas: any) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            if (schemas.body) {
                req.body = schemas.body.parse(req.body);
            }
            if (schemas.query) {
                req.query = schemas.query.parse(req.query);
            }
            if (schemas.params) {
                req.params = schemas.params.parse(req.params);
            }
            next();
        } catch (error: any) {
            // If it's a Zod error, format it nicely
            if (error.name === 'ZodError') {
                const formattedErrors = error.errors.map((err: any) => ({
                    path: err.path.join('.'),
                    message: err.message
                }));
                // Throw our custom ApiError which the global handler understands
                return next(new ApiError(400, 'Validation failed', formattedErrors));
            }
            // Pass any other errors down
            next(error);
        }
    };
};

export { validateRequest };
export default validateRequest;
