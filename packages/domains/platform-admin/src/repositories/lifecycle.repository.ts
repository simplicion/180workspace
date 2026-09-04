import { prisma } from '@workspace/db';
import { deleteObjectsFromR2 } from '@workspace/integrations';

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

    /**
     * Completely and permanently cascades deletion of a company, all 99+ child relational
     * models, all users/employees, circular references, and purges all uploaded files from Cloudflare R2 / S3.
     */
    static async fullDeleteCompany(companyId: string) {
        console.log(`[LifecycleRepository] Commencing complete cascading purge for company: ${companyId}`);

        // ─────────────────────────────────────────────────────────────────────
        // 0. GATHER IDS & HARVEST FILE KEYS / URLS FOR CLOUD STORAGE PURGE
        // ─────────────────────────────────────────────────────────────────────
        const filesToPurge: string[] = [];
        const addFile = (val?: string | null) => {
            if (val && typeof val === 'string' && val.trim()) {
                filesToPurge.push(val.trim());
            }
        };

        const company = await prisma.company.findUnique({ where: { id: companyId } }).catch(() => null);
        if (!company) {
            console.warn(`[LifecycleRepository] Company ${companyId} not found in database.`);
            return;
        }

        addFile(company.logoUrl);
        addFile(company.bannerUrl);

        // Fetch all users of this company
        const users = await prisma.user.findMany({
            where: { companyId },
            select: { id: true, image: true, photoUrl: true, bannerImage: true, signatureImage: true }
        }).catch(() => []);
        const userIds = users.map(u => u.id);
        users.forEach(u => {
            addFile(u.image);
            addFile(u.photoUrl);
            addFile(u.bannerImage);
            addFile(u.signatureImage);
        });

        // Harvest documents and versions
        const userDocFilter = userIds.length > 0 ? [{ uploadedById: { in: userIds } }] : [];
        const docs = await prisma.document.findMany({
            where: { OR: [{ companyId }, ...userDocFilter] },
            select: { id: true, fileUrl: true, fileId: true }
        }).catch(() => []);
        const docIds = docs.map(d => d.id);
        docs.forEach(d => { addFile(d.fileUrl); addFile(d.fileId); });

        if (docIds.length > 0) {
            const versions = await prisma.documentVersion.findMany({
                where: { documentId: { in: docIds } },
                select: { fileUrl: true }
            }).catch(() => []);
            versions.forEach(v => addFile(v.fileUrl));
        }

        // Harvest company media & offerings
        const medias = await prisma.companyMedia.findMany({
            where: { companyId },
            select: { imageUrl: true }
        }).catch(() => []);
        medias.forEach(m => addFile(m.imageUrl));

        const offerings = await prisma.companyOffering.findMany({
            where: { companyId },
            select: { id: true, imageUrl: true }
        }).catch(() => []);
        const offIds = offerings.map(o => o.id);
        offerings.forEach(o => addFile(o.imageUrl));

        // Harvest user resumes & application attachments
        if (userIds.length > 0) {
            const resumes = await prisma.userResume.findMany({
                where: { userId: { in: userIds } },
                select: { fileUrl: true }
            }).catch(() => []);
            resumes.forEach(r => addFile(r.fileUrl));
        }

        const jobs = await prisma.job.findMany({
            where: { companyId },
            select: { id: true }
        }).catch(() => []);
        const jobIds = jobs.map(j => j.id);

        const apps = await prisma.application.findMany({
            where: {
                OR: [
                    ...(jobIds.length > 0 ? [{ jobId: { in: jobIds } }] : []),
                    ...(userIds.length > 0 ? [{ userId: { in: userIds } }, { reviewedById: { in: userIds } }] : [])
                ]
            },
            select: { id: true, resumeUrl: true }
        }).catch(() => []);
        const appIds = apps.map(a => a.id);
        apps.forEach(a => addFile(a.resumeUrl));

        // Harvest chat & message attachments
        let chatIds: string[] = [];
        if (userIds.length > 0) {
            const chats = await prisma.chat.findMany({
                where: {
                    OR: [
                        { createdById: { in: userIds } },
                        { members: { some: { id: { in: userIds } } } }
                    ]
                },
                select: { id: true, avatar: true }
            }).catch(() => []);
            chatIds = chats.map(c => c.id);
            chats.forEach(c => addFile(c.avatar));

            const msgs = await prisma.message.findMany({
                where: {
                    OR: [
                        { senderId: { in: userIds } },
                        ...(chatIds.length > 0 ? [{ chatId: { in: chatIds } }] : [])
                    ]
                },
                select: { attachmentUrl: true }
            }).catch(() => []);
            msgs.forEach(m => addFile(m.attachmentUrl));
        }

        // Harvest expense receipts
        const expenses = await prisma.expenseTransaction.findMany({
            where: {
                OR: [
                    { companyId },
                    ...(userIds.length > 0 ? [{ employeeId: { in: userIds } }] : [])
                ]
            },
            select: { receiptUrl: true }
        }).catch(() => []);
        expenses.forEach(e => addFile(e.receiptUrl));

        console.log(`[LifecycleRepository] Collected ${userIds.length} users, ${docIds.length} docs, ${filesToPurge.length} file assets to purge.`);

        // ─────────────────────────────────────────────────────────────────────
        // 1. CHAT, MESSAGES, FORUMS, SOCIAL & AI INTERACTIONS
        // ─────────────────────────────────────────────────────────────────────
        try {
            if (userIds.length > 0 || chatIds.length > 0) {
                // Break circular message replies first
                await prisma.message.updateMany({
                    where: {
                        OR: [
                            ...(userIds.length > 0 ? [{ senderId: { in: userIds } }] : []),
                            ...(chatIds.length > 0 ? [{ chatId: { in: chatIds } }] : [])
                        ]
                    },
                    data: { replyToId: null }
                }).catch(() => {});

                // Break circular chat references
                if (chatIds.length > 0) {
                    await prisma.chat.updateMany({
                        where: { id: { in: chatIds } },
                        data: { lastMessageId: null, createdById: null }
                    }).catch(() => {});
                }

                // Delete all messages
                await prisma.message.deleteMany({
                    where: {
                        OR: [
                            ...(userIds.length > 0 ? [{ senderId: { in: userIds } }] : []),
                            ...(chatIds.length > 0 ? [{ chatId: { in: chatIds } }] : [])
                        ]
                    }
                }).catch(() => {});

                // Disconnect chat many-to-many relations and delete chats
                for (const cId of chatIds) {
                    await prisma.chat.update({
                        where: { id: cId },
                        data: {
                            admins: { set: [] },
                            members: { set: [] },
                            pinnedMessages: { set: [] }
                        }
                    }).catch(() => {});
                }

                if (chatIds.length > 0) {
                    await prisma.chat.deleteMany({ where: { id: { in: chatIds } } }).catch(() => {});
                }
            }

            // Forums & community
            if (userIds.length > 0) {
                await prisma.pollVote.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
                await prisma.savedPost.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
                await prisma.postReport.deleteMany({ where: { reporterId: { in: userIds } } }).catch(() => {});
                await prisma.forumReply.deleteMany({ where: { authorUserId: { in: userIds } } }).catch(() => {});

                const forumPosts = await prisma.forumPost.findMany({
                    where: { authorUserId: { in: userIds } },
                    select: { id: true }
                }).catch(() => []);
                for (const fp of forumPosts) {
                    await prisma.forumPost.update({
                        where: { id: fp.id },
                        data: { mentions: { set: [] } }
                    }).catch(() => {});
                }
                await prisma.forumPost.deleteMany({ where: { authorUserId: { in: userIds } } }).catch(() => {});
            }

            // AI chat sessions
            if (userIds.length > 0) {
                const aiSessions = await prisma.aiChatSession.findMany({
                    where: { userId: { in: userIds } },
                    select: { id: true }
                }).catch(() => []);
                const aiSessIds = aiSessions.map(s => s.id);
                if (aiSessIds.length > 0) {
                    await prisma.aiChatMessage.deleteMany({ where: { sessionId: { in: aiSessIds } } }).catch(() => {});
                }
                await prisma.aiChatSession.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
            }
        } catch (err: any) {
            console.error('[LifecycleRepository] Error in Chat/Social purge:', err.message);
        }

        // ─────────────────────────────────────────────────────────────────────
        // 2. WEBSITES, PIXELS, TRAFFIC & DOMAINS
        // ─────────────────────────────────────────────────────────────────────
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

            // Domain Registry purge (by companyId or registered domain/subdomain)
            await prisma.domainRegistry.deleteMany({
                where: {
                    OR: [
                        { companyId },
                        ...(company.customDomain ? [{ domain: company.customDomain }] : []),
                        ...(company.slug ? [{ domain: `${company.slug}.180workspace.com` }, { domain: company.slug }] : [])
                    ]
                }
            }).catch(() => {});
        } catch (err: any) {
            console.error('[LifecycleRepository] Error in Website/Traffic purge:', err.message);
        }

        // ─────────────────────────────────────────────────────────────────────
        // 3. FORMS & SUBMISSIONS
        // ─────────────────────────────────────────────────────────────────────
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
        } catch (err: any) {
            console.error('[LifecycleRepository] Error in Forms purge:', err.message);
        }

        // ─────────────────────────────────────────────────────────────────────
        // 4. CONTENT CALENDARS, EVENTS & MEETINGS
        // ─────────────────────────────────────────────────────────────────────
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

            const events = await prisma.event.findMany({
                where: { companyId },
                select: { id: true }
            }).catch(() => []);
            const eventIds = events.map(e => e.id);
            if (eventIds.length > 0 || userIds.length > 0) {
                await prisma.eventRegistration.deleteMany({
                    where: {
                        OR: [
                            ...(eventIds.length > 0 ? [{ eventId: { in: eventIds } }] : []),
                            ...(userIds.length > 0 ? [{ userId: { in: userIds } }] : [])
                        ]
                    }
                }).catch(() => {});
            }
            await prisma.event.deleteMany({ where: { companyId } }).catch(() => {});

            await prisma.calendarEvent.deleteMany({
                where: {
                    OR: [
                        { companyId },
                        ...(userIds.length > 0 ? [{ createdById: { in: userIds } }] : [])
                    ]
                }
            }).catch(() => {});

            const meetingLogs = await prisma.meetingLog.findMany({
                where: {
                    OR: [
                        { companyId },
                        ...(userIds.length > 0 ? [{ createdById: { in: userIds } }] : [])
                    ]
                },
                select: { id: true }
            }).catch(() => []);
            const mlIds = meetingLogs.map(m => m.id);
            if (mlIds.length > 0) {
                await prisma.meetingTranscript.deleteMany({ where: { meetingLogId: { in: mlIds } } }).catch(() => {});
            }
            await prisma.meetingLog.deleteMany({
                where: {
                    OR: [
                        { companyId },
                        ...(userIds.length > 0 ? [{ createdById: { in: userIds } }] : [])
                    ]
                }
            }).catch(() => {});
        } catch (err: any) {
            console.error('[LifecycleRepository] Error in Content/Event/Meeting purge:', err.message);
        }

        // ─────────────────────────────────────────────────────────────────────
        // 5. KNOWLEDGE BASE & ARTICLES
        // ─────────────────────────────────────────────────────────────────────
        try {
            const articles = await prisma.knowledgeArticle.findMany({
                where: {
                    OR: [
                        { companyId },
                        ...(userIds.length > 0 ? [
                            { createdById: { in: userIds } },
                            { updatedById: { in: userIds } },
                            { lockedById: { in: userIds } }
                        ] : [])
                    ]
                },
                select: { id: true }
            }).catch(() => []);
            const artIds = articles.map(a => a.id);
            if (artIds.length > 0) {
                await prisma.knowledgeArticleLink.deleteMany({ where: { articleId: { in: artIds } } }).catch(() => {});
                await prisma.knowledgeArticleVersion.deleteMany({ where: { articleId: { in: artIds } } }).catch(() => {});
            }
            if (userIds.length > 0) {
                await prisma.knowledgeArticleVersion.deleteMany({ where: { createdById: { in: userIds } } }).catch(() => {});
            }
            await prisma.knowledgeArticle.deleteMany({
                where: {
                    OR: [
                        { companyId },
                        ...(userIds.length > 0 ? [
                            { createdById: { in: userIds } },
                            { updatedById: { in: userIds } },
                            { lockedById: { in: userIds } }
                        ] : [])
                    ]
                }
            }).catch(() => {});
        } catch (err: any) {
            console.error('[LifecycleRepository] Error in Knowledge Article purge:', err.message);
        }

        // ─────────────────────────────────────────────────────────────────────
        // 6. DOCUMENTS & VERSIONS & PAGES
        // ─────────────────────────────────────────────────────────────────────
        try {
            if (docIds.length > 0) {
                await prisma.documentVersion.deleteMany({ where: { documentId: { in: docIds } } }).catch(() => {});
            }
            if (userIds.length > 0) {
                await prisma.documentPage.deleteMany({
                    where: {
                        OR: [
                            { createdById: { in: userIds } },
                            { updatedById: { in: userIds } }
                        ]
                    }
                }).catch(() => {});
            }
            await prisma.document.deleteMany({
                where: {
                    OR: [
                        { companyId },
                        ...userDocFilter,
                        ...(userIds.length > 0 ? [{ employeeId: { in: userIds } }] : [])
                    ]
                }
            }).catch(() => {});
        } catch (err: any) {
            console.error('[LifecycleRepository] Error in Document purge:', err.message);
        }

        // ─────────────────────────────────────────────────────────────────────
        // 7. PROJECTS, TASKS, MILESTONES & MODULES
        // ─────────────────────────────────────────────────────────────────────
        try {
            const projects = await prisma.project.findMany({
                where: {
                    OR: [
                        { companyId },
                        ...(userIds.length > 0 ? [{ ownerId: { in: userIds } }] : [])
                    ]
                },
                select: { id: true }
            }).catch(() => []);
            const projectIds = projects.map(p => p.id);

            await prisma.task.deleteMany({
                where: {
                    OR: [
                        ...(projectIds.length > 0 ? [{ projectId: { in: projectIds } }] : []),
                        { companyId },
                        ...(userIds.length > 0 ? [{ assigneeId: { in: userIds } }, { creatorId: { in: userIds } }] : [])
                    ]
                }
            }).catch(() => {});

            await prisma.milestone.deleteMany({
                where: {
                    OR: [
                        ...(projectIds.length > 0 ? [{ projectId: { in: projectIds } }] : []),
                        ...(userIds.length > 0 ? [{ createdById: { in: userIds } }, { completedById: { in: userIds } }] : [])
                    ]
                }
            }).catch(() => {});

            await prisma.module.deleteMany({
                where: {
                    OR: [
                        ...(projectIds.length > 0 ? [{ projectId: { in: projectIds } }] : []),
                        ...(userIds.length > 0 ? [{ createdById: { in: userIds } }, { ownerId: { in: userIds } }] : [])
                    ]
                }
            }).catch(() => {});

            await prisma.project.deleteMany({
                where: {
                    OR: [
                        { companyId },
                        ...(userIds.length > 0 ? [{ ownerId: { in: userIds } }] : [])
                    ]
                }
            }).catch(() => {});
        } catch (err: any) {
            console.error('[LifecycleRepository] Error in Project/Task purge:', err.message);
        }

        // ─────────────────────────────────────────────────────────────────────
        // 8. CRM, SALES, CLIENTS & LEADS
        // ─────────────────────────────────────────────────────────────────────
        try {
            const clients = await prisma.client.findMany({
                where: { companyId },
                select: { id: true }
            }).catch(() => []);
            const clientIds = clients.map(c => c.id);

            await prisma.clientCommunication.deleteMany({
                where: {
                    OR: [
                        ...(clientIds.length > 0 ? [{ clientId: { in: clientIds } }] : []),
                        ...(userIds.length > 0 ? [{ loggedById: { in: userIds } }] : [])
                    ]
                }
            }).catch(() => {});

            await prisma.salesActivity.deleteMany({
                where: {
                    OR: [
                        ...(clientIds.length > 0 ? [{ relatedClientId: { in: clientIds } }] : []),
                        ...(userIds.length > 0 ? [{ ownerId: { in: userIds } }] : [])
                    ]
                }
            }).catch(() => {});

            await prisma.salesTask.deleteMany({
                where: {
                    OR: [
                        ...(clientIds.length > 0 ? [{ relatedClientId: { in: clientIds } }] : []),
                        ...(userIds.length > 0 ? [{ assignedTo: { in: userIds } }] : [])
                    ]
                }
            }).catch(() => {});

            await prisma.deal.deleteMany({
                where: {
                    OR: [
                        ...(clientIds.length > 0 ? [{ clientId: { in: clientIds } }] : []),
                        ...(userIds.length > 0 ? [{ ownerId: { in: userIds } }] : []),
                        { companyId }
                    ]
                }
            }).catch(() => {});

            await prisma.quote.deleteMany({
                where: {
                    OR: [
                        ...(clientIds.length > 0 ? [{ clientId: { in: clientIds } }] : []),
                        ...(userIds.length > 0 ? [{ createdById: { in: userIds } }] : []),
                        { companyId }
                    ]
                }
            }).catch(() => {});

            await prisma.lead.deleteMany({
                where: {
                    OR: [
                        ...(userIds.length > 0 ? [{ assignedSalesRepId: { in: userIds } }] : []),
                        { companyId }
                    ]
                }
            }).catch(() => {});

            await prisma.client.deleteMany({ where: { companyId } }).catch(() => {});
        } catch (err: any) {
            console.error('[LifecycleRepository] Error in CRM/Sales purge:', err.message);
        }

        // ─────────────────────────────────────────────────────────────────────
        // 9. INVOICES, TRANSACTIONS, BILLING & SUBSCRIPTIONS
        // ─────────────────────────────────────────────────────────────────────
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

            await prisma.expenseTransaction.deleteMany({
                where: {
                    OR: [
                        { companyId },
                        ...(userIds.length > 0 ? [{ employeeId: { in: userIds } }] : [])
                    ]
                }
            }).catch(() => {});

            await prisma.companyTransaction.deleteMany({
                where: {
                    OR: [
                        { companyId },
                        ...(userIds.length > 0 ? [{ userId: { in: userIds } }] : [])
                    ]
                }
            }).catch(() => {});

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
        } catch (err: any) {
            console.error('[LifecycleRepository] Error in Invoice/Finance purge:', err.message);
        }

        // ─────────────────────────────────────────────────────────────────────
        // 10. HR, RECRUITMENT, ONBOARDING & COMPANY ENTITIES
        // ─────────────────────────────────────────────────────────────────────
        try {
            if (userIds.length > 0 || appIds.length > 0) {
                await prisma.onboarding.deleteMany({
                    where: {
                        OR: [
                            ...(userIds.length > 0 ? [{ employeeId: { in: userIds } }] : []),
                            ...(appIds.length > 0 ? [{ recruitmentId: { in: appIds } }] : [])
                        ]
                    }
                }).catch(() => {});
            }
            if (appIds.length > 0) {
                await prisma.application.deleteMany({ where: { id: { in: appIds } } }).catch(() => {});
            }
            if (userIds.length > 0) {
                await prisma.application.deleteMany({
                    where: {
                        OR: [
                            { userId: { in: userIds } },
                            { reviewedById: { in: userIds } }
                        ]
                    }
                }).catch(() => {});
            }
            await prisma.job.deleteMany({ where: { companyId } }).catch(() => {});

            if (offIds.length > 0) {
                await prisma.serviceRequest.deleteMany({ where: { serviceId: { in: offIds } } }).catch(() => {});
            }
            await prisma.serviceRequest.deleteMany({ where: { companyId } }).catch(() => {});
            await prisma.companyOffering.deleteMany({ where: { companyId } }).catch(() => {});

            await prisma.companyMedia.deleteMany({ where: { companyId } }).catch(() => {});
            await prisma.companyInvestor.deleteMany({ where: { companyId } }).catch(() => {});
            await prisma.companyCoreValue.deleteMany({ where: { companyId } }).catch(() => {});

            await prisma.companyPublicReview.deleteMany({
                where: {
                    OR: [
                        { companyId },
                        ...(userIds.length > 0 ? [{ userId: { in: userIds } }] : [])
                    ]
                }
            }).catch(() => {});

            await prisma.companyFollower.deleteMany({
                where: {
                    OR: [
                        { companyId },
                        ...(userIds.length > 0 ? [{ userId: { in: userIds } }] : [])
                    ]
                }
            }).catch(() => {});

            await prisma.savedBank.deleteMany({ where: { companyId } }).catch(() => {});
            await prisma.vendor.deleteMany({ where: { companyId } }).catch(() => {});
            await prisma.holiday.deleteMany({ where: { companyId } }).catch(() => {});
            await prisma.supportTicket.deleteMany({
                where: {
                    OR: [
                        { companyId },
                        ...(userIds.length > 0 ? [{ userId: { in: userIds } }] : [])
                    ]
                }
            }).catch(() => {});
        } catch (err: any) {
            console.error('[LifecycleRepository] Error in HR/Company Entities purge:', err.message);
        }

        // ─────────────────────────────────────────────────────────────────────
        // 11. ATTENDANCE, LEAVES, SALARIES, REVIEWS, LOGS & ASSETS
        // ─────────────────────────────────────────────────────────────────────
        try {
            await prisma.attendance.deleteMany({
                where: {
                    OR: [
                        { companyId },
                        ...(userIds.length > 0 ? [{ employeeId: { in: userIds } }] : [])
                    ]
                }
            }).catch(() => {});

            await prisma.leave.deleteMany({
                where: {
                    OR: [
                        { companyId },
                        ...(userIds.length > 0 ? [
                            { employeeId: { in: userIds } },
                            { reviewedById: { in: userIds } }
                        ] : [])
                    ]
                }
            }).catch(() => {});

            await prisma.salary.deleteMany({
                where: {
                    OR: [
                        { companyId },
                        ...(userIds.length > 0 ? [
                            { employeeId: { in: userIds } },
                            { generatedBy: { in: userIds } }
                        ] : [])
                    ]
                }
            }).catch(() => {});

            await prisma.review.deleteMany({
                where: {
                    OR: [
                        { companyId },
                        ...(userIds.length > 0 ? [
                            { employeeId: { in: userIds } },
                            { managerId: { in: userIds } }
                        ] : [])
                    ]
                }
            }).catch(() => {});

            await prisma.workLog.deleteMany({
                where: {
                    OR: [
                        { companyId },
                        ...(userIds.length > 0 ? [
                            { userId: { in: userIds } },
                            { reviewedById: { in: userIds } }
                        ] : [])
                    ]
                }
            }).catch(() => {});

            if (userIds.length > 0) {
                await prisma.timeLog.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
                await prisma.note.deleteMany({ where: { createdById: { in: userIds } } }).catch(() => {});
                await prisma.notification.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
                await prisma.activityLog.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
            }

            await prisma.goal.deleteMany({
                where: {
                    OR: [
                        { companyId },
                        ...(userIds.length > 0 ? [{ ownerId: { in: userIds } }] : [])
                    ]
                }
            }).catch(() => {});

            await prisma.asset.deleteMany({
                where: {
                    OR: [
                        { companyId },
                        ...(userIds.length > 0 ? [
                            { ownerId: { in: userIds } },
                            { createdById: { in: userIds } }
                        ] : [])
                    ]
                }
            }).catch(() => {});

            await prisma.auditLog.deleteMany({
                where: {
                    OR: [
                        { companyId },
                        ...(userIds.length > 0 ? [{ userId: { in: userIds } }] : [])
                    ]
                }
            }).catch(() => {});

            await prisma.teamActivityLog.deleteMany({
                where: {
                    OR: [
                        { companyId },
                        ...(userIds.length > 0 ? [{ actorId: { in: userIds } }] : [])
                    ]
                }
            }).catch(() => {});

            await prisma.automationLog.deleteMany({
                where: {
                    OR: [
                        { companyId },
                        ...(userIds.length > 0 ? [
                            { targetUserId: { in: userIds } },
                            { triggeredById: { in: userIds } }
                        ] : [])
                    ]
                }
            }).catch(() => {});

            await prisma.emailLog.deleteMany({
                where: {
                    OR: [
                        { companyId },
                        ...(userIds.length > 0 ? [{ sentById: { in: userIds } }] : [])
                    ]
                }
            }).catch(() => {});

            await prisma.companyConfig.deleteMany({ where: { companyId } }).catch(() => {});
            await prisma.settings.deleteMany({ where: { companyId } }).catch(() => {});
            await prisma.designation.deleteMany({ where: { companyId } }).catch(() => {});
        } catch (err: any) {
            console.error('[LifecycleRepository] Error in Logs/HR Data purge:', err.message);
        }

        // ─────────────────────────────────────────────────────────────────────
        // 12. USER PROFILES, AUTH CREDENTIALS & USERS PURGE
        // ─────────────────────────────────────────────────────────────────────
        try {
            if (userIds.length > 0) {
                await prisma.userExperience.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
                await prisma.userEducation.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
                await prisma.userSkill.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
                await prisma.userResume.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
                await prisma.userProject.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
                await prisma.userPreference.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
                await prisma.account.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
                await prisma.session.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
            }

            // Sever self-referential links (manager, designation) before deletion
            await prisma.user.updateMany({
                where: { companyId },
                data: { managerId: null, designationId: null }
            }).catch(() => {});

            // Delete users belonging to this company
            const deletedUsers = await prisma.user.deleteMany({ where: { companyId } });
            console.log(`[LifecycleRepository] Deleted ${deletedUsers.count} users for company: ${companyId}`);
        } catch (err: any) {
            console.error('[LifecycleRepository] Error in User deletion:', err.message);
            throw err; // Re-throw if user deletion fails so company is not orphaned
        }

        // ─────────────────────────────────────────────────────────────────────
        // 13. PURGE DELETION LOGS & FINALLY PURGE THE COMPANY RECORD ITSELF
        // ─────────────────────────────────────────────────────────────────────
        await prisma.deletionLog.deleteMany({ where: { companyId } }).catch(() => {});
        await prisma.company.delete({ where: { id: companyId } });
        console.log(`[LifecycleRepository] Successfully deleted Company record: ${companyId}`);

        // ─────────────────────────────────────────────────────────────────────
        // 14. PURGE UPLOADED ASSETS FROM CLOUDFLARE R2 STORAGE
        // ─────────────────────────────────────────────────────────────────────
        if (filesToPurge.length > 0) {
            try {
                console.log(`[LifecycleRepository] Purging ${filesToPurge.length} file assets from Cloudflare R2...`);
                const r2Result = await deleteObjectsFromR2(filesToPurge);
                console.log(`[LifecycleRepository] R2 Purge complete: ${r2Result.deleted} files deleted.`);
            } catch (r2Err: any) {
                console.error('[LifecycleRepository] Error during R2 file purge:', r2Err.message);
            }
        }
    }

    // Temporary helper for legacy services that require the raw prisma client
    static getRawPrismaClient() {
        return prisma;
    }
}

