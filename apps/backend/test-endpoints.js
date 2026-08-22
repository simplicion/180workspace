const { signAccessToken } = require('./src/system-configs/middleware/auth/auth');

async function run() {
    const userId = '9eceb551-fe1c-4a03-bc47-94f8fb2a54b8';
    const companyId = 'edf50d95-d26c-4d04-954c-53626478bb59';
    const token = signAccessToken(userId, companyId);
    console.log("TOKEN:", token);

    const axios = require('axios');
    try {
        const res = await axios.get('http://localhost:4002/api/v1/insights/analytics/team-activity', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("team-activity:", res.status);
    } catch (err) {
        console.error("team-activity ERROR:", err.response?.status, err.response?.data || err.message);
    }

    try {
        const res = await axios.get('http://localhost:4002/api/v1/crm-and-sales/sales/dashboard', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("sales/dashboard:", res.status);
    } catch (err) {
        console.error("sales/dashboard ERROR:", err.response?.status, err.response?.data || err.message);
    }
}
run();
