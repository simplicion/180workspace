import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '@workspace/db';
import * as webhookCtrl from './webhook.controller';
import https from 'https';
import fetch from 'node-fetch'; // May need cross-fetch or native fetch depending on Node version. Node 18+ has global fetch.

const router = express.Router();

/**
 * Verify the shared secret from n8n webhook header
 */
function verifyWebhookSecret(req: Request, res: Response, next: NextFunction) {
    const secret = req.headers['x-webhook-secret'] as string;
    const expectedSecret = process.env.N8N_WEBHOOK_SECRET;

    if (!expectedSecret || !secret) {
        return res.status(401).json({ error: 'Invalid webhook secret' });
    }

    try {
        const secretBuf = Buffer.from(secret);
        const expectedBuf = Buffer.from(expectedSecret);

        if (secretBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(secretBuf, expectedBuf)) {
            return res.status(401).json({ error: 'Invalid webhook secret' });
        }
    } catch (e) {
        return res.status(401).json({ error: 'Invalid webhook secret' });
    }
    next();
}

// ─── Payment Gateway Webhooks ────────────────────────────────────────────────
const ALLOWED_PROVIDERS = ['stripe', 'razorpay', 'paypal', 'lemonsqueezy'];

router.post('/:provider', (req: Request, res: Response, next: NextFunction) => {
    if (!ALLOWED_PROVIDERS.includes(req.params.provider)) {
        return res.status(400).json({ error: 'Invalid provider' });
    }
    webhookCtrl.handleUniversalWebhook(req, res);
});

// ─── Company Specific Payment Webhooks ───────────────────────────────────────
router.post('/company/:provider', (req: Request, res: Response, next: NextFunction) => {
    if (!ALLOWED_PROVIDERS.includes(req.params.provider)) {
        return res.status(400).json({ error: 'Invalid provider' });
    }
    webhookCtrl.handleCompanyWebhook(req, res);
});

// ─── Incoming webhooks FROM n8n ─────────────────────────────────────────────
router.post('/project-assigned', verifyWebhookSecret, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { projectId, userId, message, companyId } = req.body;
        await prisma.notification.create({
            data: {
                userId,
                companyId: companyId || 'system',
                type: 'project_assigned',
                title: 'New Project Assigned',
                message: message || 'You have been assigned to a project.',
                link: `/projects/${projectId}`,
                isRead: false
            }
        });
        res.json({ received: true });
    } catch (err) { next(err); }
});

router.post('/salary-generated', verifyWebhookSecret, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { employeeId, month, netSalary, companyId } = req.body;
        await prisma.notification.create({
            data: {
                userId: employeeId,
                companyId: companyId || 'system',
                type: 'salary_generated',
                title: 'Salary Generated',
                message: `Your salary for ${month} has been generated: ₹${netSalary}`,
                link: '/hr/salary',
                isRead: false
            }
        });
        res.json({ received: true });
    } catch (err) { next(err); }
});

// ─── Outgoing webhook triggers (called from backend controllers) ─────────────
export async function triggerN8nWebhook(path: string, data: any) {
    try {
        const settings = await prisma.platformSettings.findFirst();
        const baseUrl = settings?.webhookUrl;
        const secret = settings?.webhookSecret || '';

        if (!baseUrl) return; // Webhooks not configured

        const url = `${baseUrl.replace(/\/$/, '')}/${path}`;

        await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-webhook-secret': secret,
            },
            body: JSON.stringify(data),
        });
    } catch (err: any) {
        console.warn('[Webhook] trigger failed:', err.message);
    }
}

export default router;
