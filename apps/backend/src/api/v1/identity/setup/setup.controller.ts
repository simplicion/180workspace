import { Request, Response, NextFunction } from 'express';
import { SetupService } from '@workspace/identity';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';

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
            const { companyName, adminName, adminEmail, adminPassword } = req.body;

            if (!companyName || !adminName || !adminEmail || !adminPassword) {
                return res.status(400).json({ success: false, error: 'All fields (companyName, adminName, adminEmail, adminPassword) are required.' });
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
                logoUrl
            });

            res.status(201).json(result);

        } catch (err) {
            console.error('Register Company Error:', err);
            res.status(500).json({ success: false, error: 'Failed to register company.' });
        }
    }

    static async registerCompanyGoogle(req: Request, res: Response) {
        try {
            const { companyName, adminName, tokenId } = req.body;

            if (!companyName || !adminName || !tokenId) {
                return res.status(400).json({ success: false, error: 'Company Name, Admin Name, and Google Token are required.' });
            }

            // Verify Google token
            const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
            let payload;
            try {
                const ticket = await client.verifyIdToken({
                    idToken: tokenId,
                    audience: process.env.GOOGLE_CLIENT_ID,
                });
                payload = ticket.getPayload();
            } catch (err) {
                return res.status(401).json({ success: false, error: 'Invalid Google token' });
            }

            if (!payload || !payload.email) {
                return res.status(401).json({ success: false, error: 'Invalid Google token payload' });
            }

            const adminEmail = payload.email;

            // Generate a random password since Google Auth is used
            const randomPassword = crypto.randomBytes(16).toString('hex');
            const adminPasswordHash = await bcrypt.hash(randomPassword, 12);

            // Handle Optional logo upload
            let logoUrl = null;
            if (req.file) {
                // Cloudinary removed. Logo upload skipped for setup, or handled by R2 if configured later.
            }

            const result = await SetupService.registerCompany({
                companyName,
                adminName,
                adminEmail,
                adminPasswordHash,
                logoUrl
            });

            res.status(201).json(result);

        } catch (err) {
            console.error('Register Company Google Error:', err);
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
