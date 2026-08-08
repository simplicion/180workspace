const cron = require('node-cron');
const { prisma } = require('@workspace/db');
const VectorStore = require('./vector.store');
const AIService = require('./ai.service');

// Initialize Cron Jobs
const initCronJobs = () => {
    // 1. Automated RAG Data Synchronization (Runs every night at 2:00 AM)
    // For demonstration, we'll configure this to run every minute in dev if needed,
    // but the standard is "0 2 * * *"
    cron.schedule('0 2 * * *', async () => {
        console.log('[AI Cron] Starting automated RAG synchronization...');
        try {
            // Fetch all active companies to sync data per company
            const companies = await prisma.company.findMany({ where: { accountStatus: 'active' } });
            
            for (const company of companies) {
                // Sync Employees
                const users = await prisma.user.findMany({ where: { companyId: company.id, isActive: true } });
                for (const u of users) {
                    const text = `Employee Record: ${u.name}. Role: ${u.role}. Department: ${u.department}. Email: ${u.email}`;
                    await VectorStore.addDocument(`user_${u.id}`, text, { companyId: company.id, type: 'employee' });
                }

                // Sync Active Projects
                const projects = await prisma.project.findMany({ where: { companyId: company.id, status: { not: 'completed' } } });
                for (const p of projects) {
                    const text = `Project Record: ${p.name}. Description: ${p.description || 'None'}. Status: ${p.status}. Priority: ${p.priority}.`;
                    await VectorStore.addDocument(`project_${p.id}`, text, { companyId: company.id, type: 'project' });
                }

                // Sync Pending Tasks
                const tasks = await prisma.task.findMany({ where: { companyId: company.id, status: { not: 'done' } } });
                for (const t of tasks) {
                    const text = `Task Record: ${t.title}. Description: ${t.description || 'None'}. Status: ${t.status}. Priority: ${t.priority}.`;
                    await VectorStore.addDocument(`task_${t.id}`, text, { companyId: company.id, type: 'task' });
                }
            }
            console.log('[AI Cron] RAG synchronization completed successfully.');
        } catch (error) {
            console.error('[AI Cron] Failed during RAG sync:', error);
        }
    });

    // 2. Proactive AI Alerts (Runs every morning at 8:00 AM)
    // E.g., '0 8 * * *'
    cron.schedule('0 8 * * *', async () => {
        console.log('[AI Cron] Starting proactive AI alerts...');
        try {
            const companies = await prisma.company.findMany({ where: { accountStatus: 'active' } });
            
            for (const company of companies) {
                // Find overdue tasks
                const overdueTasks = await prisma.task.findMany({
                    where: { 
                        companyId: company.id, 
                        status: { not: 'done' },
                        dueDate: { lt: new Date() }
                    },
                    include: { assignee: true }
                });

                if (overdueTasks.length > 0) {
                    // Get company admins/managers to alert
                    const admins = await prisma.user.findMany({
                        where: { companyId: company.id, role: { in: ['admin', 'manager'] } }
                    });

                    for (const admin of admins) {
                        const prompt = `You are a proactive AI assistant. You just noticed that the company has ${overdueTasks.length} overdue tasks. 
Draft a short, friendly, and helpful proactive alert message to the manager (Name: ${admin.name}). 
Example: "Hi [Name], I noticed there are X overdue tasks today. Would you like me to send reminders to the assignees?"`;

                        const aiResponse = await AIService.getInsights(prompt, {});
                        
                        // Create proactive AI chat message (Requires session handling in real app, we'll create a system session or broadcast)
                        // Mocking session ID for demonstration or you can push via Socket.io
                        const systemSessionId = `system_alert_${admin.id}`;
                        await prisma.aiChatMessage.create({
                            data: {
                                sessionId: systemSessionId,
                                role: 'assistant',
                                content: aiResponse
                            }
                        });
                        console.log(`[AI Cron] Proactive alert generated for ${admin.name}`);
                    }
                }
            }
        } catch (error) {
            console.error('[AI Cron] Failed during proactive alerts:', error);
        }
    });
};

module.exports = { initCronJobs };
