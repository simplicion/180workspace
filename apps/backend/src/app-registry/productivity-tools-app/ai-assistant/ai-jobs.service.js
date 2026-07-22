const { prisma } = require('@workspace/db');
const AIService = require('./ai.service');

// We will use a simple setInterval for the MVP background job
let intervalId = null;

class AiJobsService {
    static init() {
        console.log('AI Background Jobs Initialized');
        // Run every 1 minute for testing, or set to 1 hour (3600000 ms) for prod
        // Let's do 1 minute for demo purposes
        const INTERVAL_MS = 60 * 1000; 
        
        intervalId = setInterval(async () => {
            await this.scanDeadlines();
        }, INTERVAL_MS);
    }

    static async scanDeadlines() {
        try {
            // Find tasks due within the next 3 days that haven't been proactively alerted yet
            const threeDaysFromNow = new Date();
            threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

            const impendingTasks = await prisma.task.findMany({
                where: {
                    dueDate: {
                        lte: threeDaysFromNow,
                        gte: new Date()
                    },
                    status: {
                        not: 'completed'
                    }
                },
                take: 10
            });

            for (const task of impendingTasks) {
                // Find user's latest chat session
                const latestSession = await prisma.aiChatSession.findFirst({
                    where: { userId: task.assigneeId },
                    orderBy: { updatedAt: 'desc' }
                });

                if (latestSession) {
                    // Have we already alerted about this task recently?
                    // We can do a quick check in AiChatMessage
                    const existingAlert = await prisma.aiChatMessage.findFirst({
                        where: {
                            sessionId: latestSession.id,
                            role: 'assistant',
                            content: { contains: task.id }
                        }
                    });

                    if (!existingAlert) {
                        console.log(` AI sending proactive alert for Task: ${task.title}`);
                        
                        // Ask the AI to draft a friendly reminder
                        const prompt = `System Prompt: You are a proactive AI assistant. The user has a task named "${task.title}" due soon. Write a very brief (2 sentences max) proactive message to the user reminding them and asking if they need help drafting anything related to it. Do not include placeholders, write a direct message.`;
                        
                        // We use a dummy empty settings object since it's a background task
                        const generatedMsg = await AIService.getInsights(prompt, {});

                        await prisma.aiChatMessage.create({
                            data: {
                                sessionId: latestSession.id,
                                role: 'assistant',
                                content: ` **Proactive Alert:**\n${generatedMsg}\n\n*(Ref Task: ${task.id})*`
                            }
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error in AiJobsService.scanDeadlines:', error);
        }
    }
}

module.exports = AiJobsService;
