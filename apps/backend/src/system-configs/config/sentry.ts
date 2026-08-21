import { Request, Response, NextFunction } from 'express';

// Sentry removed, providing no-op handlers
const Sentry = {
    captureException: (error: any, context?: any) => console.error(error, context),
    Handlers: {
        requestHandler: () => (req: Request, res: Response, next: NextFunction) => next(),
        errorHandler: () => (err: any, req: Request, res: Response, next: NextFunction) => next(err),
    }
};

export default Sentry;
