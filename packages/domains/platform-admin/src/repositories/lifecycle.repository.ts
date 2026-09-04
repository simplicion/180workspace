import { prisma } from '@workspace/db';

export class LifecycleRepository {
    static async getPlatformSettings() {
        return prisma.platformSettings.findFirst();
    }

    static async updateCompany(id: string, data: any) {
        return prisma.company.update({
            where: { id },
            data
        });
    }

    static async findCompanies(where: any) {
        return prisma.company.findMany({ where });
    }

    static async findCompanyById(id: string) {
        return prisma.company.findUnique({ where: { id } });
    }

    static async safeDeleteModels(companyId: string, modelsToClean: string[]) {
        let recordsDeleted: any = {};
        for (const modelName of modelsToClean) {
            const prismaModel = modelName.charAt(0).toLowerCase() + modelName.slice(1);
            if ((prisma as any)[prismaModel]) {
                const count = await (prisma as any)[prismaModel].count({ where: { companyId } });
                await (prisma as any)[prismaModel].deleteMany({ where: { companyId } });
                recordsDeleted[modelName] = count;
            }
        }
        return recordsDeleted;
    }

    static async createDeletionLog(data: any) {
        return prisma.deletionLog.create({ data });
    }

    static async fullDeleteCompany(companyId: string) {
        // 1. Get all user IDs belonging to this company
        const users = await prisma.user.findMany({
            where: { companyId },
            select: { id: true }
        }).catch(() => []);
        const userIds = users.map(u => u.id);

        // 2. Traffic Links & related rules/logs
        try {
            const trafficLinks = await prisma.trafficLink.findMany({
                where: { companyId },
                select: { id: true }
            }).catch(() => []);
            const linkIds = trafficLinks.map(t => t.id);
            if (linkIds.length > 0) {
                await prisma.trafficRule.deleteMany({ where: { linkId: { in: linkIds } } }).catch(() => {});
                await prisma.trafficLog.deleteMany({ where: { linkId: { in: linkIds } } }).catch(() => {});
            }
            await prisma.trafficLink.deleteMany({ where: { companyId } }).catch(() => {});
        } catch {}

        // 3. Forms & submissions & fields & values
        try {
            const forms = await prisma.form.findMany({
                where: { companyId },
                select: { id: true }
            }).catch(() => []);
            const formIds = forms.map(f => f.id);
            if (formIds.length > 0) {
                const submissions = await prisma.formSubmission.findMany({
                    where: { formId: { in: formIds } },
                    select: { id: true }
                }).catch(() => []);
                const subIds = submissions.map(s => s.id);
                if (subIds.length > 0) {
                    await prisma.formSubmissionValue.deleteMany({ where: { submissionId: { in: subIds } } }).catch(() => {});
                }
                await prisma.formSubmission.deleteMany({ where: { formId: { in: formIds } } }).catch(() => {});
                await prisma.formField.deleteMany({ where: { formId: { in: formIds } } }).catch(() => {});
            }
            await prisma.formSubmission.deleteMany({ where: { companyId } }).catch(() => {});
            await prisma.form.deleteMany({ where: { companyId } }).catch(() => {});
        } catch {}

        // 4. Invoices & line items & tax items & reminders
        try {
            const invoices = await prisma.invoice.findMany({
                where: { companyId },
                select: { id: true }
            }).catch(() => []);
            const invoiceIds = invoices.map(i => i.id);
            if (invoiceIds.length > 0) {
                await prisma.invoiceLineItem.deleteMany({ where: { invoiceId: { in: invoiceIds } } }).catch(() => {});
                await prisma.invoiceTaxItem.deleteMany({ where: { invoiceId: { in: invoiceIds } } }).catch(() => {});
                await prisma.invoiceReminder.deleteMany({ where: { invoiceId: { in: invoiceIds } } }).catch(() => {});
            }
            await prisma.invoice.deleteMany({ where: { companyId } }).catch(() => {});
        } catch {}

        // 5. Projects & tasks & modules & milestones
        try {
            const projects = await prisma.project.findMany({
                where: { companyId },
                select: { id: true }
            }).catch(() => []);
            const projectIds = projects.map(p => p.id);
            if (projectIds.length > 0) {
                await prisma.task.deleteMany({ where: { projectId: { in: projectIds } } }).catch(() => {});
                await prisma.milestone.deleteMany({ where: { projectId: { in: projectIds } } }).catch(() => {});
                await prisma.module.deleteMany({ where: { projectId: { in: projectIds } } }).catch(() => {});
            }
            await prisma.task.deleteMany({ where: { companyId } }).catch(() => {});
            await prisma.project.deleteMany({ where: { companyId } }).catch(() => {});
        } catch {}

        // 6. Documents & pages & versions
        try {
            const userDocFilter = userIds.length > 0 ? [{ uploadedById: { in: userIds } }] : [];
            const docs = await prisma.document.findMany({
                where: { OR: [{ companyId }, ...userDocFilter] },
                select: { id: true }
            }).catch(() => []);
            const docIds = docs.map(d => d.id);
            if (docIds.length > 0) {
                await prisma.documentVersion.deleteMany({ where: { documentId: { in: docIds } } }).catch(() => {});
            }
            if (userIds.length > 0) {
                await prisma.documentPage.deleteMany({ where: { OR: [{ createdById: { in: userIds } }, { updatedById: { in: userIds } }] } }).catch(() => {});
            }
            await prisma.document.deleteMany({ where: { companyId } }).catch(() => {});
        } catch {}

        // 7. Content Calendars & pieces & AI logs
        try {
            const cals = await prisma.contentCalendar.findMany({
                where: { companyId },
                select: { id: true }
            }).catch(() => []);
            const calIds = cals.map(c => c.id);
            if (calIds.length > 0) {
                await prisma.calendarContentPiece.deleteMany({ where: { calendarId: { in: calIds } } }).catch(() => {});
                await prisma.aiRequestLog.deleteMany({ where: { calendarId: { in: calIds } } }).catch(() => {});
            }
            if (userIds.length > 0) {
                await prisma.aiRequestLog.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
                await prisma.calendarTemplate.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
            }
            await prisma.contentCalendar.deleteMany({ where: { companyId } }).catch(() => {});
        } catch {}

        // 8. Knowledge Articles & versions & links
        try {
            const articles = await prisma.knowledgeArticle.findMany({
                where: { companyId },
                select: { id: true }
            }).catch(() => []);
            const artIds = articles.map(a => a.id);
            if (artIds.length > 0) {
                await prisma.knowledgeArticleLink.deleteMany({ where: { articleId: { in: artIds } } }).catch(() => {});
                await prisma.knowledgeArticleVersion.deleteMany({ where: { articleId: { in: artIds } } }).catch(() => {});
            }
            await prisma.knowledgeArticle.deleteMany({ where: { companyId } }).catch(() => {});
        } catch {}

        // 9. Meeting Logs & transcripts
        try {
            const meetingLogs = await prisma.meetingLog.findMany({
                where: { companyId },
                select: { id: true }
            }).catch(() => []);
            const mlIds = meetingLogs.map(m => m.id);
            if (mlIds.length > 0) {
                await prisma.meetingTranscript.deleteMany({ where: { meetingLogId: { in: mlIds } } }).catch(() => {});
            }
            await prisma.meetingLog.deleteMany({ where: { companyId } }).catch(() => {});
        } catch {}

        // 10. Websites & pixels & submissions
        try {
            const websites = await prisma.website.findMany({
                where: { companyId },
                select: { id: true }
            }).catch(() => []);
            const siteIds = websites.map(w => w.id);
            if (siteIds.length > 0) {
                await prisma.pixel.deleteMany({ where: { websiteId: { in: siteIds } } }).catch(() => {});
                await prisma.websiteFormSubmission.deleteMany({ where: { websiteId: { in: siteIds } } }).catch(() => {});
            }
            await prisma.website.deleteMany({ where: { companyId } }).catch(() => {});
        } catch {}

        // 11. Events & registrations
        try {
            const events = await prisma.event.findMany({
                where: { companyId },
                select: { id: true }
            }).catch(() => []);
            const eventIds = events.map(e => e.id);
            if (eventIds.length > 0) {
                await prisma.eventRegistration.deleteMany({ where: { eventId: { in: eventIds } } }).catch(() => {});
            }
            await prisma.event.deleteMany({ where: { companyId } }).catch(() => {});
        } catch {}

        // 12. Jobs & applications & onboardings
        try {
            const jobs = await prisma.job.findMany({
                where: { companyId },
                select: { id: true }
            }).catch(() => []);
            const jobIds = jobs.map(j => j.id);
            const userAppFilter = userIds.length > 0 ? [{ userId: { in: userIds } }, { reviewedById: { in: userIds } }] : [];
            const apps = await prisma.application.findMany({
                where: { OR: (jobIds.length > 0 ? [{ jobId: { in: jobIds } }] : []).concat(userAppFilter as any) },
                select: { id: true }
            }).catch(() => []);
            const appIds = apps.map(a => a.id);
            if (userIds.length > 0 || appIds.length > 0) {
                await prisma.onboarding.deleteMany({
                    where: { OR: [
                        ...(userIds.length > 0 ? [{ employeeId: { in: userIds } }] : []),
                        ...(appIds.length > 0 ? [{ recruitmentId: { in: appIds } }] : [])
                    ] }
                }).catch(() => {});
            }
            if (appIds.length > 0) {
                await prisma.application.deleteMany({ where: { id: { in: appIds } } }).catch(() => {});
            }
            await prisma.job.deleteMany({ where: { companyId } }).catch(() => {});
        } catch {}

        // 13. Offerings & service requests
        try {
            const offerings = await prisma.companyOffering.findMany({
                where: { companyId },
                select: { id: true }
            }).catch(() => []);
            const offIds = offerings.map(o => o.id);
            if (offIds.length > 0) {
                await prisma.serviceRequest.deleteMany({ where: { serviceId: { in: offIds } } }).catch(() => {});
            }
            await prisma.serviceRequest.deleteMany({ where: { companyId } }).catch(() => {});
            await prisma.companyOffering.deleteMany({ where: { companyId } }).catch(() => {});
        } catch {}

        // 14. Clients & client communications & CRM relations
        try {
            const clients = await prisma.client.findMany({
                where: { companyId },
                select: { id: true }
            }).catch(() => []);
            const clientIds = clients.map(c => c.id);
            if (clientIds.length > 0 || userIds.length > 0) {
                await prisma.clientCommunication.deleteMany({
                    where: { OR: [
                        ...(clientIds.length > 0 ? [{ clientId: { in: clientIds } }] : []),
                        ...(userIds.length > 0 ? [{ loggedById: { in: userIds } }] : [])
                    ] }
                }).catch(() => {});
                await prisma.salesActivity.deleteMany({
                    where: { OR: [
                        ...(clientIds.length > 0 ? [{ relatedClientId: { in: clientIds } }] : []),
                        ...(userIds.length > 0 ? [{ ownerId: { in: userIds } }] : [])
                    ] }
                }).catch(() => {});
                await prisma.deal.deleteMany({
                    where: { OR: [
                        ...(clientIds.length > 0 ? [{ clientId: { in: clientIds } }] : []),
                        ...(userIds.length > 0 ? [{ ownerId: { in: userIds } }] : [])
                    ] }
                }).catch(() => {});
            }
            await prisma.client.deleteMany({ where: { companyId } }).catch(() => {});
        } catch {}

        // 15. Leads & sales tasks & quotes
        try {
            if (userIds.length > 0) {
                await prisma.salesTask.deleteMany({ where: { assignedTo: { in: userIds } } }).catch(() => {});
                await prisma.lead.deleteMany({ where: { assignedSalesRepId: { in: userIds } } }).catch(() => {});
            }
            await prisma.quote.deleteMany({ where: { companyId } }).catch(() => {});
        } catch {}

        // 16. AI Chat sessions & messages for company users
        if (userIds.length > 0) {
            try {
                const aiSessions = await prisma.aiChatSession.findMany({
                    where: { userId: { in: userIds } },
                    select: { id: true }
                }).catch(() => []);
                const sessionIds = aiSessions.map(s => s.id);
                if (sessionIds.length > 0) {
                    await prisma.aiChatMessage.deleteMany({ where: { sessionId: { in: sessionIds } } }).catch(() => {});
                }
                await prisma.aiChatSession.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
            } catch {}
        }

        // 17. Forum items, posts, replies, poll votes
        if (userIds.length > 0) {
            try {
                await prisma.pollVote.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
                await prisma.savedPost.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
                await prisma.postReport.deleteMany({ where: { reporterId: { in: userIds } } }).catch(() => {});
                await prisma.forumReply.deleteMany({ where: { authorUserId: { in: userIds } } }).catch(() => {});
                await prisma.forumPost.deleteMany({ where: { authorUserId: { in: userIds } } }).catch(() => {});
            } catch {}
        }

        // 18. User-specific models
        if (userIds.length > 0) {
            const directUserModels = [
                'account', 'session', 'userPreference', 'userProject', 'userEducation',
                'userExperience', 'userSkill', 'userResume', 'notification',
                'timeLog'
            ];

            for (const model of directUserModels) {
                try {
                    if ((prisma as any)[model]) {
                        await (prisma as any)[model].deleteMany({
                            where: { userId: { in: userIds } }
                        }).catch(() => {});
                    }
                } catch {}
            }

            try {
                await prisma.note.deleteMany({ where: { createdById: { in: userIds } } }).catch(() => {});
                await prisma.attendance.deleteMany({ where: { employeeId: { in: userIds } } }).catch(() => {});
                await prisma.leave.deleteMany({ where: { employeeId: { in: userIds } } }).catch(() => {});
                await prisma.salary.deleteMany({ where: { employeeId: { in: userIds } } }).catch(() => {});
                await prisma.review.deleteMany({ where: { OR: [{ employeeId: { in: userIds } }, { managerId: { in: userIds } }] } }).catch(() => {});
                await prisma.workLog.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
                await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
                await prisma.teamActivityLog.deleteMany({ where: { actorId: { in: userIds } } }).catch(() => {});
                await prisma.expenseTransaction.deleteMany({ where: { employeeId: { in: userIds } } }).catch(() => {});
                await prisma.companyTransaction.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
                await prisma.calendarEvent.deleteMany({ where: { createdById: { in: userIds } } }).catch(() => {});
                await prisma.goal.deleteMany({ where: { ownerId: { in: userIds } } }).catch(() => {});
                await prisma.asset.deleteMany({ where: { OR: [{ createdById: { in: userIds } }, { ownerId: { in: userIds } }] } }).catch(() => {});
                await prisma.automationLog.deleteMany({ where: { OR: [{ targetUserId: { in: userIds } }, { triggeredById: { in: userIds } }] } }).catch(() => {});
                await prisma.emailLog.deleteMany({ where: { sentById: { in: userIds } } }).catch(() => {});
            } catch {}
        }

        // 19. All direct company-scoped models
        const companyModels = [
            'savedBank', 'companyCoreValue', 'companyPublicReview', 'companyFollower',
            'companyMedia', 'companyInvestor', 'designation', 'holiday', 'vendor',
            'attendance', 'leave', 'salary', 'review', 'workLog', 'auditLog',
            'teamActivityLog', 'expenseTransaction', 'companyTransaction', 'calendarEvent',
            'goal', 'asset', 'automationLog', 'emailLog', 'settings', 'companyConfig',
            'domainRegistry', 'supportTicket'
        ];

        for (const model of companyModels) {
            try {
                if ((prisma as any)[model]) {
                    await (prisma as any)[model].deleteMany({
                        where: { companyId }
                    }).catch(() => {});
                }
            } catch {}
        }

        // 20. Clear user self-references (managerId, designationId) before deleting users
        try {
            await prisma.user.updateMany({
                where: { companyId },
                data: { managerId: null, designationId: null }
            }).catch(() => {});
        } catch {}

        // 21. Delete users belonging to this company
        await prisma.user.deleteMany({ where: { companyId } }).catch(() => {});

        // 22. Delete subscriptions & payment histories
        try {
            const subs = await prisma.subscription.findMany({
                where: { companyId },
                select: { id: true }
            }).catch(() => []);
            const subIds = subs.map(s => s.id);
            if (subIds.length > 0) {
                await prisma.paymentHistory.deleteMany({ where: { subscriptionId: { in: subIds } } }).catch(() => {});
            }
            await prisma.paymentHistory.deleteMany({ where: { companyId } }).catch(() => {});
            await prisma.subscription.deleteMany({ where: { companyId } }).catch(() => {});
        } catch {}

        // 23. Delete DeletionLog for this company if any
        await prisma.deletionLog.deleteMany({ where: { companyId } }).catch(() => {});

        // 24. Finally delete the Company record itself
        await prisma.company.delete({ where: { id: companyId } });
    }

    // Temporary helper for legacy services that require the raw prisma client
    static getRawPrismaClient() {
        return prisma;
    }
}
