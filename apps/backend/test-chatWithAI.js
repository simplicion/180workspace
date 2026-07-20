const { getTenantPrisma } = require('@workspace/db');
const aiController = require('./src/app-registry/productivity-tools-app/ai-assistant/ai.controller');

async function test() {
    try {
        const db = require('@workspace/db').prisma;
        
        // Find an employee user
        const user = await db.user.findFirst({
            where: { role: 'employee' }
        });
        
        if (!user) {
            console.log('No employee found');
            return;
        }
        
        const tenantDb = await getTenantPrisma(user.companyId);
        
        // Mock req and res
        const req = {
            user: user,
            prisma: tenantDb,
            body: {
                message: "Hello AI!",
                history: [],
                sessionId: null
            }
        };
        
        const res = {
            json: function(data) {
                console.log('Success Response:', data);
            },
            status: function(code) {
                console.log('Status code:', code);
                return this;
            }
        };
        
        const next = function(err) {
            console.error('Next called with error:', err);
        };
        
        console.log('Calling chatWithAI...');
        await aiController.chatWithAI(req, res, next);
        
    } catch (err) {
        console.error('Unhandled Error:', err);
    }
}

test();
