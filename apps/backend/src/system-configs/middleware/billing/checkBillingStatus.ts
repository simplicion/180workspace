import { Request, Response, NextFunction } from 'express';

const checkBillingStatus = async (req: any, res: Response, next: NextFunction) => {
    // In the freemium model, an expired or missing subscription gracefully falls back 
    // to the Free Starter Plan. Limits are dynamically enforced in the API services 
    // based on the current plan, so we no longer hard block the user at the middleware level.
    next();
};

export default checkBillingStatus;
