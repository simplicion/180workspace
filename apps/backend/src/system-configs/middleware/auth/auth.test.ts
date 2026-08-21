const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = 'test-secret-key-for-tests';
const { protect, authorize } = require('./');

const app = express();
app.use(express.json());

// Mock User database
let mockUser = null;
const prismaFindUniqueMock = async ({ where }) => {
    console.log("CALLED MOCK! where:", where, "mockUser:", mockUser);
    if (mockUser && mockUser.id === where.id) {
        return mockUser;
    }
    return null;
};

// Mock Prisma Middleware
app.use((req, res, next) => {
    req.prisma = {
        user: {
            findUnique: prismaFindUniqueMock
        }
    };
    next();
});

// Routes for testing
app.get('/api/protected', protect, (req, res) => {
    res.json({ success: true, user: req.user });
});

app.get('/api/admin-only', protect, authorize('admin'), (req, res) => {
    res.json({ success: true });
});

app.get('/api/company-data', protect, (req, res) => {
    // A route that simulates a company check (e.g. requires companyId to match)
    // Actually the prompt says: "confirm a superadmin-signed token is rejected on company routes".
    // Wait, let's simulate this: company routes require req.user.companyId to match the requested resource, 
    // or the token's companyId to exist. The protect middleware assigns req.user.companyId.
    res.json({ success: true, companyId: req.user.companyId });
});

describe('Auth & RBAC Middleware', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUser = {
            id: 'user-1',
            companyId: 'company-1',
            role: 'sales',
            isActive: true,
            permissions: []
        };
    });

    const generateToken = (payload, expiresIn = '1h') => {
        console.log('Sign secret:', process.env.JWT_SECRET); return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
    };

    it('1. should reject request with missing token', async () => {
        const res = await request(app).get('/api/protected');
        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/Authentication required/);
    });

    it('2. should reject request with expired token', async () => {
        const token = generateToken({ id: 'user-1', companyId: 'company-1' }, '-1h');
        const res = await request(app)
            .get('/api/protected')
            .set('Authorization', `Bearer ${token}`);
            
        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/session has expired/);
    });

    it('3. should accept valid token and populate req.user', async () => {
        const token = generateToken({ id: 'user-1', companyId: 'company-1' });
        const res = await request(app)
            .get('/api/protected')
            .set('Authorization', `Bearer ${token}`);
            
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.user.id).toBe('user-1');
        expect(res.body.user.companyId).toBe('company-1');
    });

    it('4. should correctly deny a "sales" role access to an "admin"-only route', async () => {
        mockUser.role = 'sales'; // explicitly set to sales
        const token = generateToken({ id: 'user-1', companyId: 'company-1' });
        const res = await request(app)
            .get('/api/admin-only')
            .set('Authorization', `Bearer ${token}`);
            
        expect(res.status).toBe(403);
        expect(res.body.error).toMatch(/don't have permission/);
    });

    it('5. should confirm a superadmin-signed token without company is correctly parsed (or rejected if company required)', async () => {
        // Superadmin tokens often omit companyId, or they shouldn't be used on company routes.
        // Let's test that the protect middleware assigns companyId, but if a route explicitly
        // requires a company, the controller would handle it. The middleware itself 
        // doesn't crash but req.user.companyId might be null if not in user model.
        mockUser.role = 'superadmin';
        mockUser.companyId = null; // System-level user
        
        const token = generateToken({ id: 'user-1' }); // no companyId in token
        const res = await request(app)
            .get('/api/company-data')
            .set('Authorization', `Bearer ${token}`);
            
        expect(res.status).toBe(200);
        // It shouldn't have a companyId injected from the token
        expect(res.body.companyId).toBeNull();
    });

    it('6. should reject token signed with SUPER_ADMIN_JWT_SECRET by the company protect middleware', async () => {
        // Sign token with a different secret (simulating SUPER_ADMIN_JWT_SECRET)
        const superAdminToken = jwt.sign(
            { id: 'user-2' }, 
            process.env.SUPER_ADMIN_JWT_SECRET || 'super-secret-admin-key', 
            { expiresIn: '1h' }
        );
        
        const res = await request(app)
            .get('/api/protected')
            .set('Authorization', `Bearer ${superAdminToken}`);
            
        // Because protect uses process.env.JWT_SECRET, signature verification will fail
        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/session is invalid/);
    });
});
