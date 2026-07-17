require('dotenv').config();
const http = require('http');
const { signAccessToken } = require('./src/system-configs/middleware/auth/auth');
const { PrismaClient } = require('@workspace/db');
const prisma = new PrismaClient();

async function run() {
    const user = await prisma.user.findFirst();
    if (!user) { console.log('no user'); return; }
    
    // sign token
    const token = signAccessToken(user.id, user.companyId);
    
    const options = {
        hostname: 'localhost',
        port: 3002,
        path: '/api/emails/stats',
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token }
    };
    const req = http.request(options, res => {
        let data = '';
        console.log('Status Code:', res.statusCode);
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => { console.log('Body:', data); });
    });
    req.on('error', e => { console.error(e); });
    req.end();
}
run();
