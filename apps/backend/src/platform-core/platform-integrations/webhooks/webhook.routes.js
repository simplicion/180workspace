'use strict';

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { prisma } = require('@workspace/db');

/**
 * Verify the shared secret from n8n webhook header
 */
function verifyWebhookSecret(req, res, next) {
    const secret = req.headers['x-webhook-secret'];
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

const webhookCtrl = require('./universal.controller');
const companyWebhookCtrl = require('./companyUniversal.controller');

// â”€â”€ Payment Gateway Webhooks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ALLOWED_PROVIDERS = ['stripe', 'razorpay', 'paypal', 'lemonsqueezy'];

router.post('/:provider', (req, res, next) => {
    if (!ALLOWED_PROVIDERS.includes(req.params.provider)) {
        return res.status(400).json({ error: 'Invalid provider' });
    }
    webhookCtrl.handleWebhook(req, res, next);
});

// â”€â”€ Company Specific Payment Webhooks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/company/:provider', (req, res, next) => {
    if (!ALLOWED_PROVIDERS.includes(req.params.provider)) {
        return res.status(400).json({ error: 'Invalid provider' });
    }
    companyWebhookCtrl.handleWebhook(req, res, next);
});


// â”€â”€ Incoming webhooks FROM n8n â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/project-assigned', verifyWebhookSecret, async (req, res, next) => {
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

router.post('/salary-generated', verifyWebhookSecret, async (req, res, next) => {
    try {
        const { employeeId, month, netSalary, companyId } = req.body;
        await prisma.notification.create({
            data: {
                userId: employeeId,
                companyId: companyId || 'system',
                type: 'salary_generated',
                title: 'Salary Generated',
                message: `Your salary for ${month} has been generated: â‚¹${netSalary}`,
                link: '/hr/salary',
                isRead: false
            }
        });
        res.json({ received: true });
    } catch (err) { next(err); }
});

// â”€â”€ Outgoing webhook triggers (called from backend controllers) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const axios = process.env.N8N_BASE_URL ? require('https') : null;

async function triggerN8nWebhook(path, data) {
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
    } catch (err) {
        console.warn('[Webhook] trigger failed:', err.message);
    }
}

router.triggerN8nWebhook = triggerN8nWebhook;
module.exports = router;
