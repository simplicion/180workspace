const { getTenantPrisma } = require('@workspace/db');
const AIService = require('./src/app-registry/productivity-tools-app/ai-assistant/ai.service');

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
        
        // Find company metadata
        const company = await db.company.findUnique({
            where: { id: user.companyId }
        });
        
        let metadata = company.metadata || {};
        if (typeof metadata === 'string') {
            try { metadata = JSON.parse(metadata); } catch(e) {}
        }
        if (typeof metadata === 'string') {
            try { metadata = JSON.parse(metadata); } catch(e) {}
        }
        
        const settings = await db.settings.findFirst() || {};
        const combinedSettings = { ...settings, ...metadata };
        
        console.log('Combined Settings for AI:', combinedSettings.aiProvider, combinedSettings.openaiKey ? 'Has OpenAI Key' : 'No Key');
        
        // Try calling the AI service
        console.log('Calling AI Service...');
        const prompt = 'Hello, this is a test from an employee.';
        const result = await AIService.getInsights(prompt, combinedSettings, { max_tokens: 10 });
        console.log('Result:', result);
        
    } catch (err) {
        console.error('Error:', err);
    }
}

test();
