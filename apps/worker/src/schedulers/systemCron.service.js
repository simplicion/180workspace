'use strict';

const cron = require('node-cron');
const AutomationService = require('./automation.service');
const AnalyticsService = require('../../modules/insights/analytics.service');
const AIAutomationService = require('../../modules/ai-comms/ai-automation.service');
const SalesRuleEngine = require('../../modules/sales/sales-rule-engine.service');
const { prisma, getTenantPrisma } = require('@workspace/db');

/**
 * Cron Service - Handles all scheduled tasks across all tenants
 * Multi-tenant aware: Iterates over all active companies and runs logic for each.
 */
class CronService {
    init() {
        console.info('Initializing Multi-Tenant Cron Service...');

        // 1. Every Hour: Check for approaching deadlines (Projects & Tasks)
        cron.schedule('0 * * * *', () => this.runForAllTenants(this.checkDeadlines));

        // 1b. Every Hour: Check for overdue tasks
        cron.schedule('0 * * * *', () => this.runForAllTenants(this.checkOverdueTasks));

        // 2. Daily at 23:55: Mark Absences
        cron.schedule('55 23 * * *', () => this.runForAllTenants(this.dailyAttendanceCheck));

        // 3. 1st of every month at 00:05: Generate Salaries
        cron.schedule('5 0 1 * *', () => this.runForAllTenants(this.monthlySalaryGeneration));

        // 4. Every 15 minutes: Check for upcoming meetings
        cron.schedule('*/15 * * * *', () => this.runForAllTenants(this.meetingReminders));

        // 5. Daily at 01:00: Run AI Risk Analysis
        cron.schedule('0 1 * * *', () => this.runForAllTenants(this.runProjectRiskAnalysis));

        // 6. Daily at 10:30: Check for late attendance
        cron.schedule('30 10 * * *', () => this.runForAllTenants(this.lateAttendanceCheck));

        // 7. 1st of every month at 01:00: Attendance Pattern Analysis
        cron.schedule('0 1 1 * *', () => this.runForAllTenants(this.monthlyAttendancePatternCheck));

        // 8. Daily at 02:00: Run Sales CRM Stagnation Checks
        cron.schedule('0 2 * * *', () => this.runForAllTenants(this.dailySalesStagnationCheck));

        // 9. Daily at 03:00: Run Data Cleanup (Logs > 30 days)
        cron.schedule('0 3 * * *', () => this.runForAllTenants(this.dataCleanup));

        // 10. Every Hour: Auto Check-out for users who forgot to clock out
        cron.schedule('0 * * * *', () => this.runForAllTenants(this.autoCheckOutWorker));

        console.info('Multi-Tenant Cron Jobs Scheduled Successfully.');
    }

    /**
     * Helper to run a task for all connected tenants
     */
    async runForAllTenants(taskFn) {
        try {
            const companies = await prisma.company.findMany({
                where: { accountStatus: 'active' }
            });
            for (const company of companies) {
                try {
                    const tenantPrisma = getTenantPrisma(company.id);
                    await taskFn.call(this, tenantPrisma, company);
                } catch (err) {
                    console.error(`[CronService] Failed for tenant ${company.name} (${company.id}):`, err.message);
                }
            }
        } catch (err) {
            console.error('[CronService] Failed to fetch companies:', err.message);
        }
    }

    async checkDeadlines(tenantPrisma) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Project Deadlines
        const projects = await tenantPrisma.project.findMany({
            where: {
                deadline: { lte: tomorrow, gt: new Date() },
                status: { not: 'Completed' }
            }
        });

        for (const project of projects) {
            // Find users who are members of this project
            // In Prisma schema, Project members might be via user.companyId or specific assignments.
            // Let's notify all active users of the company or assigned users.
            const users = await tenantPrisma.user.findMany({
                where: { isActive: true }
            });

            for (const user of users) {
                await AutomationService.trigger({
                    eventType: 'project_deadline',
                    targetUser: user.id,
                    relatedItem: { itemId: project.id, itemModel: 'Project' },
                    description: `Deadline approaching for project: ${project.name}`,
                    metadata: { projectName: project.name, dueDate: project.deadline }
                }, tenantPrisma);
            }
        }

        // Task Deadlines
        const tasks = await tenantPrisma.task.findMany({
            where: {
                dueDate: { lte: tomorrow, gt: new Date() },
                status: { not: 'Completed' }
            }
        });

        for (const task of tasks) {
            if (task.assigneeId) {
                await AutomationService.trigger({
                    eventType: 'task_reminder',
                    targetUser: task.assigneeId,
                    relatedItem: { itemId: task.id, itemModel: 'Task' },
                    description: `Task "${task.title}" is due soon.`,
                    metadata: { taskName: task.title, dueDate: task.dueDate }
                }, tenantPrisma);
            }

            if (AnalyticsService.shouldEscalateTask(task)) {
                await AutomationService.trigger({
                    eventType: 'task_escalated',
                    targetUser: task.assigneeId,
                    relatedItem: { itemId: task.id, itemModel: 'Task' },
                    description: `URGENT: Task "${task.title}" is past due and has been escalated.`,
                    metadata: { taskName: task.title, status: 'overdue' }
                }, tenantPrisma);
            }
        }
    }

    async checkOverdueTasks(tenantPrisma, company) {
        const { sendTaskOverdueEmail } = require('./email.service');
        const now = new Date();

        const overdueTasks = await tenantPrisma.task.findMany({
            where: {
                dueDate: { lt: now },
                status: { not: 'done' },
                isOverdueNotified: false
            }
        });

        for (const task of overdueTasks) {
            if (task.assigneeId) {
                const assignee = await tenantPrisma.user.findUnique({
                    where: { id: task.assigneeId }
                });
                if (assignee) {
                    // Reduce performance score (minimum 0)
                    const updatedScore = Math.max(0, (assignee.performanceScore || 100) - 1);
                    await tenantPrisma.user.update({
                        where: { id: assignee.id },
                        data: { performanceScore: updatedScore }
                    });

                    // Send Email
                    const taskUrl = `${process.env.CLIENT_URL || company.websiteUrl || ''}/dashboard/tasks`;
                    await sendTaskOverdueEmail(
                        assignee.email,
                        assignee.name,
                        task.title,
                        task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Unknown',
                        taskUrl,
                        tenantPrisma
                    );

                    // Send App Notification
                    await AutomationService.trigger({
                        eventType: 'task_overdue',
                        targetUser: assignee.id,
                        relatedItem: { itemId: task.id, itemModel: 'Task' },
                        description: `Task "${task.title}" is overdue. 1 point deducted from performance score.`,
                        metadata: { taskName: task.title, dueDate: task.dueDate }
                    }, tenantPrisma);
                }
            }

            // Mark as notified to prevent hourly deduction for the exact same task
            await tenantPrisma.task.update({
                where: { id: task.id },
                data: { isOverdueNotified: true }
            });
        }
    }

    async dailyAttendanceCheck(tenantPrisma) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const employees = await tenantPrisma.user.findMany({
            where: { role: 'USER', isActive: true } // USER role is default employee role in unified schema
        });

        for (const emp of employees) {
            const attendance = await tenantPrisma.attendance.findFirst({
                where: {
                    userId: emp.id,
                    date: { gte: today }
                }
            });

            if (!attendance) {
                await tenantPrisma.attendance.create({
                    data: {
                        userId: emp.id,
                        date: today,
                        status: 'absent',
                        checkIn: '',
                        checkOut: '',
                        workHours: 0
                    }
                });

                await AutomationService.trigger({
                    eventType: 'attendance_absence',
                    targetUser: emp.id,
                    description: `You were marked absent for ${today.toDateString()}.`,
                    metadata: { date: today }
                }, tenantPrisma);
            }
        }
    }

    async monthlySalaryGeneration(tenantPrisma) {
        const today = new Date();
        const settings = await tenantPrisma.settings.findFirst() || {};
        const releaseDate = settings.salaryReleaseDate || 1;
        if (today.getDate() !== releaseDate) return;

        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);
        const monthName = lastMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

        const employees = await tenantPrisma.user.findMany({
            where: { role: 'USER', isActive: true }
        });

        for (const emp of employees) {
            const existing = await tenantPrisma.salary.findFirst({
                where: { userId: emp.id, month: monthName }
            });
            if (existing) continue;

            const absences = await tenantPrisma.attendance.count({
                where: {
                    userId: emp.id,
                    date: { gte: lastMonth, lte: endOfLastMonth },
                    status: 'absent'
                }
            });

            const baseSalary = emp.salary || 0;
            const netSalary = AnalyticsService.calculateNetSalary(baseSalary, 22, absences, 0, 0, 0);

            const salary = await tenantPrisma.salary.create({
                data: {
                    userId: emp.id,
                    month: monthName,
                    baseSalary,
                    netSalary,
                    status: 'pending'
                }
            });

            const admins = await tenantPrisma.user.findMany({
                where: { role: { in: ['admin'] } }
            });

            for (const admin of admins) {
                await AutomationService.trigger({
                    eventType: 'salary_generated',
                    targetUser: admin.id,
                    relatedItem: { itemId: salary.id, itemModel: 'Salary' },
                    description: `Salary draft for ${emp.name} (${monthName}) is ready for review.`,
                    metadata: { month: monthName, employeeName: emp.name }
                }, tenantPrisma);
            }
        }
    }

    async meetingReminders(tenantPrisma) {
        const now = new Date();
        const in30Mins = new Date(now.getTime() + 30 * 60 * 1000);

        const upcoming = await tenantPrisma.calendarEvent.findMany({
            where: {
                startDate: { gte: now, lte: in30Mins },
                emailSent: false
            }
        });

        for (const event of upcoming) {
            // Find participants associated with this event
            // In Prisma schema, event has attendees relations.
            // Let's query attendees for the event.
            const attendees = await tenantPrisma.user.findMany({
                where: {
                    meetingAttended: {
                        some: { id: event.id }
                    }
                }
            });

            for (const participant of attendees) {
                await AutomationService.trigger({
                    eventType: 'meeting_reminder',
                    targetUser: participant.id,
                    relatedItem: { itemId: event.id, itemModel: 'CalendarEvent' },
                    description: `Reminder: Meeting "${event.title}" starts at ${new Date(event.startTime).toLocaleTimeString()}`,
                    metadata: { title: event.title, startTime: event.startTime, roomId: event.roomId }
                }, tenantPrisma);
            }

            await tenantPrisma.calendarEvent.update({
                where: { id: event.id },
                data: { emailSent: true }
            });
        }
    }

    async runProjectRiskAnalysis(tenantPrisma) {
        const activeProjects = await tenantPrisma.project.findMany({
            where: { status: { in: ['in_progress', 'on_hold'] } }
        });
        const settings = await tenantPrisma.settings.findFirst() || {};

        for (const project of activeProjects) {
            const tasks = await tenantPrisma.task.findMany({
                where: { projectId: project.id },
                select: { title: true, status: true, dueDate: true }
            });
            if (tasks.length === 0) continue;

            const aiResult = await AIAutomationService.predictProjectRisk(tasks, settings);

            if (aiResult.risk === 'High') {
                const admins = await tenantPrisma.user.findMany({
                    where: { role: { in: ['admin'] } }
                });
                for (const admin of admins) {
                    await AutomationService.trigger({
                        eventType: 'project_risk_alert',
                        targetUser: admin.id,
                        relatedItem: { itemId: project.id, itemModel: 'Project' },
                        description: `High risk detected for project "${project.name}": ${aiResult.reason}`,
                        metadata: { projectName: project.name, risk: aiResult.risk, reason: aiResult.reason }
                    }, tenantPrisma);
                }
            }
        }
    }

    async lateAttendanceCheck(tenantPrisma) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const employees = await tenantPrisma.user.findMany({
            where: { role: 'USER', isActive: true }
        });
        for (const emp of employees) {
            const attendance = await tenantPrisma.attendance.findFirst({
                where: { userId: emp.id, date: { gte: today } }
            });
            if (!attendance) {
                await AutomationService.trigger({
                    eventType: 'attendance_late',
                    targetUser: emp.id,
                    description: `Reminder: You haven't checked in for today yet.`,
                    metadata: { currentTime: new Date().toLocaleTimeString() }
                }, tenantPrisma);
            }
        }
    }

    async monthlyAttendancePatternCheck(tenantPrisma) {
        const firstDayOfMonth = new Date();
        firstDayOfMonth.setDate(1);
        firstDayOfMonth.setHours(0, 0, 0, 0);

        const employees = await tenantPrisma.user.findMany({
            where: { role: 'USER', isActive: true }
        });
        for (const emp of employees) {
            const lateCount = await tenantPrisma.attendance.count({
                where: {
                    userId: emp.id,
                    date: { gte: firstDayOfMonth },
                    status: 'late'
                }
            });

            if (AnalyticsService.isAttendanceIssue(lateCount)) {
                const admins = await tenantPrisma.user.findMany({
                    where: { role: { in: ['admin'] } }
                });
                for (const admin of admins) {
                    await AutomationService.trigger({
                        eventType: 'attendance_alert',
                        targetUser: admin.id,
                        description: `Attendance Alert: Employee ${emp.name} has ${lateCount} late entries this month.`,
                        metadata: { employeeName: emp.name, lateCount }
                    }, tenantPrisma);
                }
            }
        }
    }

    async dailySalesStagnationCheck(tenantPrisma) {
        try {
            await SalesRuleEngine.runDailyStagnationCheck(tenantPrisma);
        } catch (err) {
            console.error('[SalesRuleEngine Error]', err);
        }
    }

    async dataCleanup(tenantPrisma) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        try {
            await tenantPrisma.automationLog.deleteMany({
                where: { timestamp: { lt: thirtyDaysAgo } }
            });
            await tenantPrisma.notification.deleteMany({
                where: { createdAt: { lt: thirtyDaysAgo } }
            });
        } catch (err) {
            console.error('[DataCleanup] Error:', err.message);
        }
    }

    async autoCheckOutWorker(tenantPrisma, company) {
        const config = await tenantPrisma.settings.findFirst() || {};
        const standardEnd = config.standardEndTime || '18:00';
        
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        if (currentTime < standardEnd) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const pending = await tenantPrisma.attendance.findMany({
            where: {
                date: { gte: today },
                checkIn: { not: '' },
                checkOut: ''
            }
        });

        for (const record of pending) {
            const [h1, m1] = record.checkIn.split(':').map(Number);
            const [h2, m2] = standardEnd.split(':').map(Number);
            const actualTotal = (h2 * 60 + m2) - (h1 * 60 + m1);
            const standardTotal = 8 * 60; // 8 hours standard shift
            const exitStatus = (actualTotal < standardTotal) ? 'early_exit' : 'on_time';

            const workHours = parseFloat((actualTotal / 60).toFixed(2));

            await tenantPrisma.attendance.update({
                where: { id: record.id },
                data: {
                    checkOut: standardEnd,
                    workHours: workHours,
                    shiftStatus: record.shiftStatus !== 'late' && exitStatus === 'early_exit' ? 'early_exit' : record.shiftStatus,
                    notes: (record.notes || '') + ' [Auto Checked Out by system]'
                }
            });
        }
    }
}

module.exports = new CronService();
