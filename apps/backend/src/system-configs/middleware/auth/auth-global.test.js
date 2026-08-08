const jwt = require('jsonwebtoken');
const { protect } = require('../../../src/middleware/auth');

describe('Auth Middleware - protect', () => {
    let req;
    let res;
    let next;
    const ORIGINAL_ENV = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...ORIGINAL_ENV };
        process.env.JWT_SECRET = 'company-secret';
        process.env.SUPER_ADMIN_JWT_SECRET = 'superadmin-secret';

        req = {
            headers: {},
            query: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
    });

    afterAll(() => {
        process.env = ORIGINAL_ENV;
    });

    it('should reject a token signed with SUPER_ADMIN_JWT_SECRET', async () => {
        // Sign a token using the super admin secret
        const superAdminToken = jwt.sign(
            { id: '123', role: 'superadmin' },
            process.env.SUPER_ADMIN_JWT_SECRET
        );

        req.headers.authorization = `Bearer ${superAdminToken}`;

        await protect(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                error: 'Your session is invalid. Please sign in again.'
            })
        );
        expect(next).not.toHaveBeenCalled();
    });

    it('should allow a token signed with JWT_SECRET', async () => {
        // Sign a token using the company secret
        const companyToken = jwt.sign(
            { id: '456', role: 'employee' },
            process.env.JWT_SECRET
        );

        req.headers.authorization = `Bearer ${companyToken}`;
        
        // Mock prisma to return a valid user to bypass the next db checks
        req.prisma = {
            user: {
                findUnique: jest.fn().mockResolvedValue({
                    id: '456',
                    isActive: true,
                    roles: ['employee']
                })
            }
        };

        await protect(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });
});
