const request = require('supertest');
const express = require('express');
const { getStatus, validateCoupon } = require('./billing.controller.js');
const { protect } = require('../../../system-configs/middleware/auth/auth.js');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret-key-for-tests';

// Mock services
const mockGetActiveSubscription = jest.fn();
const mockGetTrialCountdown = jest.fn();
const mockApplyCoupon = jest.fn();

jest.mock('../../services/billing.service', () => ({
    getActiveSubscription: (...args) => mockGetActiveSubscription(...args),
    getTrialCountdown: (...args) => mockGetTrialCountdown(...args),
    applyCoupon: (...args) => mockApplyCoupon(...args)
}));

jest.mock('@workspace/db', () => ({
    prisma: {
        company: {
            findUnique: jest.fn()
        },
        platformSettings: {
            findFirst: jest.fn()
        },
        plan: {
            findUnique: jest.fn()
        },
        user: {
            findUnique: jest.fn()
        }
    }
}));

const { prisma } = require('@workspace/db');

const app = express();
app.use(express.json());

const generateToken = (payload, expiresIn = '1h') => {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

// Mock user for auth
app.use((req, res, next) => {
    req.prisma = prisma; // Attach mock prisma for consistency if needed by other middleware
    next();
});

app.get('/api/billing/status', protect, getStatus);
app.post('/api/billing/coupon', protect, validateCoupon);

describe('Billing Controller Logic (Phase 3)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        prisma.user.findUnique.mockResolvedValue({
            id: 'user-1',
            companyId: 'company-A',
            isActive: true
        });
    });

    it('1. should calculate and return current subscription status accurately', async () => {
        const token = generateToken({ id: 'user-1', companyId: 'company-A' });

        prisma.user.findUnique.mockResolvedValue({
            id: 'user-1',
            companyId: 'company-A',
            isActive: true
        });

        prisma.company.findUnique.mockResolvedValue({
            id: 'company-A',
            name: 'Company A',
            subscriptionStatus: 'active',
            autopayEnabled: true
        });
        prisma.platformSettings.findFirst.mockResolvedValue({
            paymentsEnabled: true
        });
        mockGetActiveSubscription.mockResolvedValue({
            plan: { planName: 'Pro', price: 5000, currency: 'INR', billingCycle: 'monthly' }
        });
        mockGetTrialCountdown.mockReturnValue(0);

        const res = await request(app)
            .get('/api/billing/status')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.subscriptionStatus).toBe('active');
        expect(res.body.planName).toBe('Pro');
        expect(res.body.planPrice).toBe(5000);
        expect(res.body.autopayEnabled).toBe(true);
    });

    it('2. should accurately validate and apply a valid coupon code', async () => {
        const token = generateToken({ id: 'user-1', companyId: 'company-A' });

        prisma.plan.findUnique.mockResolvedValue({
            id: 'plan-1',
            price: 1000
        });
        mockApplyCoupon.mockResolvedValue({
            discountAmount: 200,
            finalAmount: 800,
            coupon: { discountType: 'percentage', discountValue: 20 }
        });

        const res = await request(app)
            .post('/api/billing/coupon')
            .set('Authorization', `Bearer ${token}`)
            .send({ couponCode: 'SAVE20', planId: 'plan-1' });

        expect(res.status).toBe(200);
        expect(res.body.valid).toBe(true);
        expect(res.body.discountAmount).toBe(200);
        expect(res.body.finalAmount).toBe(800);
        expect(res.body.originalAmount).toBe(1000);
    });

    it('3. should reject an invalid coupon code properly', async () => {
        const token = generateToken({ id: 'user-1', companyId: 'company-A' });

        prisma.plan.findUnique.mockResolvedValue({
            id: 'plan-1',
            price: 1000
        });
        mockApplyCoupon.mockRejectedValue(new Error('Invalid coupon code'));

        const res = await request(app)
            .post('/api/billing/coupon')
            .set('Authorization', `Bearer ${token}`)
            .send({ couponCode: 'FAKE', planId: 'plan-1' });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/Invalid coupon code/i);
    });
});
