import { Request, Response, NextFunction } from 'express';

/**
 * type-caster.middleware.js
 * 
 * Automatically casts known Prisma schema date and numeric fields from strings to
 * their correct types (Date, Float, Int) so that Prisma doesn't throw validation errors.
 */

// Prisma DateTime fields across the platform
const dateFields = new Set([
  'dueDate', 'startDate', 'endDate', 'deadline', 'joinDate', 'trialStartDate', 'trialEndDate', 
  'nextChargeDate', 'emailVerified', 'otpExpiry', 'deletedAt', 'paidAt', 'reviewedAt', 'completedAt', 
  'dateScheduled', 'appliedDate', 'endTime', 'welcomeAcknowledgedAt', 'autopayLastFailedAt',
  'autopayPausedAt', 'cancelledAt', 'subscriptionStartDate', 'subscriptionEndDate', 'renewalDate', 
  'expiresAt', 'date', 'foundedDate'
]);

// Prisma Float fields across the platform
const floatFields = new Set([
  'estimatedHours', 'workHours', 'cost', 'budget', 'amount', 'tax', 'discount', 'subTotal', 'total', 'hours'
]);

// Prisma Int fields across the platform
const intFields = new Set([
  'daysFromDue', 'salaryRangeMin', 'salaryRangeMax', 'smtpPort', 'dbPort', 'maxUses', 'expires_at'
]);

/**
 * Recursively parses an object and casts recognized keys
 */
const castTypes = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    
    // Support casting arrays recursively as well
    if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
            castTypes(obj[i]);
        }
        return;
    }

    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const val = obj[key];
            
            if (val === null || val === undefined || val === '') {
                // If it's an empty string for a date/number field, normalize to null
                if (val === '' && (dateFields.has(key) || floatFields.has(key) || intFields.has(key))) {
                    obj[key] = null;
                }
            } else if (dateFields.has(key) && typeof val === 'string') {
                const parsed = new Date(val);
                // Ensure it's a valid date
                if (!isNaN(parsed.getTime())) {
                    obj[key] = parsed;
                }
            } else if (floatFields.has(key) && typeof val === 'string') {
                const parsed = parseFloat(val);
                if (!isNaN(parsed)) {
                    obj[key] = parsed;
                }
            } else if (intFields.has(key) && typeof val === 'string') {
                const parsed = parseInt(val, 10);
                if (!isNaN(parsed)) {
                    obj[key] = parsed;
                }
            } else if (typeof val === 'object') {
                castTypes(val); // Recursive call for nested objects
            }
        }
    }
};

export default (req: Request, res: Response, next: NextFunction) => {
    if (req.body) {
        castTypes(req.body);
    }
    next();
};
