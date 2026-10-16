import { Request, Response, NextFunction } from 'express';
import { SetupService } from '@workspace/identity';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';


export class SetupController {
    static async getSetupStatus(req: Request, res: Response) {
        try {
            const status = await SetupService.getSetupStatus();
            res.status(200).json(status);
        } catch (err) {
            res.status(200).json({
                success: true,
                isConfigured: true,
                adminExists: false
            });
        }
    }

    // --- Multi-Company Setup Methods ---
    static async registerCompany(req: Request, res: Response) {
        try {
            const { companyName, adminName, adminEmail, adminPassword, country, currency } = req.body;

            if (!companyName || !adminName || !adminEmail || !adminPassword || !country) {
                return res.status(400).json({ success: false, error: 'All fields (companyName, adminName, adminEmail, adminPassword, country) are required.' });
            }

            // Handle Optional logo upload
            let logoUrl = null;
            if (req.file) {
                // Cloudinary removed. Logo upload skipped for setup, or handled by R2 if configured later.
            }

            const adminPasswordHash = await bcrypt.hash(adminPassword, 12);

            const result = await SetupService.registerCompany({
                companyName,
                adminName,
                adminEmail,
                adminPasswordHash,
                logoUrl,
                country,
                currency
            });

            res.status(201).json(result);

        } catch (err) {
            console.error('Register Company Error:', err);
            res.status(500).json({ success: false, error: 'Failed to register company.' });
        }
    }



    static async configureCompany(req: Request, res: Response) {
        try {
            const { setupToken } = req.body;

            if (!setupToken) {
                return res.status(400).json({ success: false, error: 'Setup token is required' });
            }

            const result = await SetupService.configureCompany(setupToken);
            res.status(200).json(result);

        } catch (err: any) {
            console.error('Configure Company Error:', err);
            res.status(500).json({ success: false, error: err.message || 'Failed to configure company.' });
        }
    }

    // Legacy method for standalone deployment (noop)
    static async configureDatabase(req: Request, res: Response, next: NextFunction) {
        res.status(200).json({
            success: true,
            message: 'Legacy database setup bypassed.'
        });
    }
}
