const jwt = require('jsonwebtoken');
const { prisma } = require('@workspace/db');

module.exports = async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
        
        if (!token) {
            if (process.env.DEBUG_SOCKET_AUTH === 'true') {
                console.log('[Socket Auth] No token provided');
            }
            return next(new Error('Authentication required'));
        }

        const secret = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET;
        const superAdminSecret = process.env.SUPER_ADMIN_JWT_SECRET;
        if (!secret) {
            console.error('[Socket Auth] CRITICAL: No JWT secret found in environment variables');
            return next(new Error('Internal server error'));
        }

        let decoded;
        let isSuperAdmin = false;
        try {
            decoded = jwt.verify(token, secret);
        } catch (jwtErr) {
            if (superAdminSecret) {
                try {
                    decoded = jwt.verify(token, superAdminSecret);
                    isSuperAdmin = true;
                } catch (saErr) {
                    // ignore
                }
            }
            
            if (!decoded) {
                if (process.env.DEBUG_SOCKET_AUTH === 'true' || jwtErr.name === 'TokenExpiredError') {
                    console.error(`[Socket Auth] JWT Verification failed: ${jwtErr.name} - ${jwtErr.message}`);
                }
                const message = jwtErr.name === 'TokenExpiredError' ? 'Session expired' : 'Invalid token';
                return next(new Error(message));
            }
        }

        if (isSuperAdmin || !decoded.companyId) {
            socket.userId = decoded.id;
            socket.companyId = null;
            socket.user = { _id: decoded.id, name: 'Admin User', isActive: true };
            return next();
        }

        try {
            const user = await prisma.user.findUnique({
                where: { id: decoded.id }
            });

            if (!user || !user.isActive) {
                if (process.env.DEBUG_SOCKET_AUTH === 'true') {
                    console.log(`[Socket Auth] User ${decoded.id} not found or inactive in company ${decoded.companyId}`);
                }
                return next(new Error('User not found or inactive'));
            }

            socket.userId = user.id;
            socket.companyId = decoded.companyId;
            socket.user = user;
            next();
        } catch (dbErr) {
            console.error('[Socket Auth] Database error:', dbErr.message);
            return next(new Error('Internal server error'));
        }
    } catch (err) {
        console.error('[Socket Auth] General Error:', err.message);
        next(new Error('Authentication failed'));
    }
};
