const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

jest.mock('@workspace/db', () => ({
    prisma: {
        // mock any prisma global methods if needed
    }
}));

const { getSalaries, generateSalary, hrApproveSalary } = require('./salary.controller.js');
const { protect } = require('../../../system-configs/middleware/auth/auth.js');

process.env.JWT_SECRET = 'test-secret-key-for-tests';

const app = express();
app.use(express.json());

const generateToken = (payload, expiresIn = '1h') => {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

// Mock Services
jest.mock('../../services/automation.service', () => ({
    trigger: jest.fn()
}));

const mockSalaryFindMany = jest.fn();
const mockSalaryFindFirst = jest.fn();
const mockSalaryUpsert = jest.fn();
const mockSalaryUpdate = jest.fn();

app.use((req, res, next) => {
    // Mock user for auth
    req.prisma = {
        user: {
            findUnique: jest.fn().mockResolvedValue({
                id: 'user-1',
                companyId: 'company-A',
                isActive: true
            })
        },
        salary: {
            findMany: mockSalaryFindMany,
            findFirst: mockSalaryFindFirst,
            upsert: mockSalaryUpsert,
            update: mockSalaryUpdate
        }
    };
    next();
});

app.get('/api/salaries', protect, getSalaries);
app.post('/api/salaries', protect, generateSalary);
app.put('/api/salaries/:id/approve', protect, hrApproveSalary);

describe('Salary Controller & Tenant Isolation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('1. Tenant Isolation: should only fetch salaries for the logged-in user\'s company (Company A)', async () => {
        mockSalaryFindMany.mockResolvedValue([]);
        const token = generateToken({ id: 'user-1', companyId: 'company-A' });

        const res = await request(app)
            .get('/api/salaries')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        // Verify that the query explicitly enforces companyId
        expect(mockSalaryFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ companyId: 'company-A' })
            })
        );
    });

    it('2. Salary Logic: should calculate netSalary correctly when generating a salary', async () => {
        mockSalaryFindFirst.mockResolvedValue(null);
        mockSalaryUpsert.mockImplementation(async ({ update, create }) => create);
        
        const token = generateToken({ id: 'user-1', companyId: 'company-A' });
        const res = await request(app)
            .post('/api/salaries')
            .set('Authorization', `Bearer ${token}`)
            .send({
                employeeId: 'emp-123',
                month: '2026-07',
                baseSalary: 10000,
                deductions: 2000,
                bonuses: 1500
            });

        expect(res.status).toBe(201);
        // Net Salary = 10000 - 2000 + 1500 = 9500
        expect(res.body.salary.netSalary).toBe(9500);
        expect(res.body.salary.companyId).toBe('company-A');
    });

    it('3. Salary Logic: should reject hrApproveSalary if salary record does not belong to the tenant', async () => {
        // Mock findFirst returning null because companyId didn't match
        mockSalaryFindFirst.mockResolvedValue(null);
        
        const token = generateToken({ id: 'user-1', companyId: 'company-A' });
        const res = await request(app)
            .put('/api/salaries/sal-123/approve')
            .set('Authorization', `Bearer ${token}`)
            .send({
                deductions: 500
            });

        expect(res.status).toBe(404);
        expect(res.body.error).toMatch(/not found/);
        
        // Ensure the findFirst query tried to restrict by companyId
        expect(mockSalaryFindFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    id: 'sal-123',
                    companyId: 'company-A'
                })
            })
        );
    });
});
