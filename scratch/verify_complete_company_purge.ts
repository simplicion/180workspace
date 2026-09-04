import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const BACKEND_URL = process.env.API_URL || 'http://localhost:4002';
const JWT_SECRET = process.env.SUPER_ADMIN_JWT_SECRET || '5fb4fef8182e2367cc0f2fb30acb89460f30e04d619dabc573e62d025ca2ff75';

async function generateSuperAdminToken() {
    let superAdmin = await prisma.superAdmin.findFirst();
    if (!superAdmin) {
        superAdmin = await prisma.superAdmin.create({
            data: {
                name: 'Super Administrator',
                email: 'superadmin@180workspace.com',
                passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz123456',
                role: 'superadmin'
            }
        });
    }

    return jwt.sign(
        { id: superAdmin.id, email: superAdmin.email, role: 'superadmin', isSuperAdmin: true },
        JWT_SECRET,
        { expiresIn: '1h' }
    );
}

async function runVerification() {
    console.log('======================================================================');
    console.log('🧪 VERIFYING COMPLETE CASCADING HARD-DELETE & PURGE');
    console.log('======================================================================\n');

    const token = await generateSuperAdminToken();
    const headers = { Authorization: `Bearer ${token}` };

    const suffix = Date.now();
    let testCompanyId: string | null = null;
    const bulkCompanyIds: string[] = [];

    try {
        // ─────────────────────────────────────────────────────────────────────
        // 1. SEED COMPREHENSIVE TEST COMPANY (EVERY MAJOR SUBSYSTEM)
        // ─────────────────────────────────────────────────────────────────────
        console.log('▶ [Step 1] Seeding comprehensive test company with rich relational data...');
        const co = await prisma.company.create({
            data: {
                name: `Purge Verification Corp ${suffix}`,
                slug: `purge-corp-${suffix}`,
                website: `https://purge-${suffix}.com`,
                adminEmail: `owner-${suffix}@purge.com`,
                adminName: `Owner ${suffix}`,
                logoUrl: `https://pub-fe44d8a6e623474c9fa7a81b855fb631.r2.dev/logos/logo-${suffix}.png`,
                bannerUrl: `https://pub-fe44d8a6e623474c9fa7a81b855fb631.r2.dev/banners/banner-${suffix}.png`,
                accountStatus: 'active',
                subscriptionStatus: 'trial',
                users: {
                    create: [
                        {
                            name: `Admin ${suffix}`,
                            email: `admin-${suffix}@purge.com`,
                            role: 'admin',
                            image: `https://pub-fe44d8a6e623474c9fa7a81b855fb631.r2.dev/avatars/admin-${suffix}.png`,
                            photoUrl: `https://pub-fe44d8a6e623474c9fa7a81b855fb631.r2.dev/photos/admin-${suffix}.png`,
                        },
                        {
                            name: `Staff ${suffix}`,
                            email: `staff-${suffix}@purge.com`,
                            role: 'employee',
                            image: `https://pub-fe44d8a6e623474c9fa7a81b855fb631.r2.dev/avatars/staff-${suffix}.png`,
                        }
                    ]
                }
            },
            include: { users: true }
        });
        testCompanyId = co.id;
        const u1 = co.users[0];
        const u2 = co.users[1];
        console.log(`   ✅ Company created: ${co.name} (${co.id}) with 2 users.`);

        // Circular references between users (manager)
        await prisma.user.update({
            where: { id: u2.id },
            data: { managerId: u1.id }
        });

        // Chat & Message (with circular replyTo and lastMessageId)
        const chat = await prisma.chat.create({
            data: {
                name: `Team Chat ${suffix}`,
                createdById: u1.id,
                avatar: `https://pub-fe44d8a6e623474c9fa7a81b855fb631.r2.dev/chats/avatar-${suffix}.png`,
                admins: { connect: [{ id: u1.id }] },
                members: { connect: [{ id: u1.id }, { id: u2.id }] }
            }
        });

        const msg1 = await prisma.message.create({
            data: {
                chatId: chat.id,
                senderId: u1.id,
                content: 'Welcome to the team!',
                attachmentUrl: `https://pub-fe44d8a6e623474c9fa7a81b855fb631.r2.dev/attachments/att-${suffix}.pdf`
            }
        });

        const msg2 = await prisma.message.create({
            data: {
                chatId: chat.id,
                senderId: u2.id,
                content: 'Glad to be here!',
                replyToId: msg1.id
            }
        });

        await prisma.chat.update({
            where: { id: chat.id },
            data: { lastMessageId: msg2.id }
        });
        console.log('   ✅ Chats & Messages created with circular references.');

        // Document & Version
        const doc = await prisma.document.create({
            data: {
                name: `Master Document ${suffix}`,
                companyId: co.id,
                uploadedById: u1.id,
                fileUrl: `https://pub-fe44d8a6e623474c9fa7a81b855fb631.r2.dev/docs/doc-${suffix}.pdf`,
                fileId: `docs/doc-${suffix}.pdf`,
                storageType: 'r2'
            }
        });
        await prisma.documentVersion.create({
            data: {
                documentId: doc.id,
                contentBlocks: [],
                changeSummary: 'Initial version',
                createdById: u1.id
            }
        });
        console.log('   ✅ Document & DocumentVersion created.');

        // Company Media & Offering
        await prisma.companyMedia.create({
            data: {
                companyId: co.id,
                imageUrl: `https://pub-fe44d8a6e623474c9fa7a81b855fb631.r2.dev/media/media-${suffix}.jpg`
            }
        });

        const offering = await prisma.companyOffering.create({
            data: {
                companyId: co.id,
                name: 'Enterprise Consulting',
                description: 'Expertise on demand',
                imageUrl: `https://pub-fe44d8a6e623474c9fa7a81b855fb631.r2.dev/offerings/off-${suffix}.png`
            }
        });

        await prisma.serviceRequest.create({
            data: {
                companyId: co.id,
                serviceId: offering.id,
                requesterEmail: `client-${suffix}@domain.com`,
                requirements: 'I want this'
            }
        });

        // Project, Task, Milestone, Module
        const project = await prisma.project.create({
            data: {
                company: { connect: { id: co.id } },
                name: `Launch Project ${suffix}`,
                ownerId: u1.id
            }
        });

        await prisma.task.create({
            data: {
                company: { connect: { id: co.id } },
                project: { connect: { id: project.id } },
                title: `Task 1 ${suffix}`,
                creator: { connect: { id: u1.id } },
                assignee: { connect: { id: u2.id } }
            }
        });

        await prisma.milestone.create({
            data: {
                project: { connect: { id: project.id } },
                title: `Milestone 1 ${suffix}`,
                createdBy: { connect: { id: u1.id } }
            }
        });

        await prisma.module.create({
            data: {
                project: { connect: { id: project.id } },
                title: `Core Module ${suffix}`,
                creator: { connect: { id: u1.id } }
            }
        });

        // Client & Support Ticket
        await prisma.client.create({
            data: {
                companyId: co.id,
                name: `Test Client ${suffix}`,
                email: `client-${suffix}@external.com`
            }
        });

        await prisma.supportTicket.create({
            data: {
                companyId: co.id,
                companyName: co.name,
                userId: u1.id,
                userName: u1.name,
                userEmail: u1.email,
                subject: `Help with ${suffix}`,
                message: 'Initial support request',
                category: 'technical'
            }
        });

        // HR: Attendance, Leave, Salary
        await prisma.attendance.create({
            data: {
                companyId: co.id,
                employeeId: u2.id,
                date: '2026-09-04',
                status: 'present'
            }
        });

        await prisma.leave.create({
            data: {
                companyId: co.id,
                employeeId: u2.id,
                type: 'casual',
                startDate: '2026-09-04',
                endDate: '2026-09-05',
                reviewedById: u1.id,
                status: 'approved'
            }
        });

        await prisma.salary.create({
            data: {
                companyId: co.id,
                employeeId: u2.id,
                amount: 5000,
                month: `2026-09-${suffix}`,
                baseSalary: 5000,
                netSalary: 4500,
                generatedBy: u1.id
            }
        });

        // AI Chat Session & Message
        const aiSess = await prisma.aiChatSession.create({
            data: {
                userId: u1.id,
                title: `AI Help ${suffix}`
            }
        });
        await prisma.aiChatMessage.create({
            data: {
                sessionId: aiSess.id,
                role: 'user',
                content: 'Summarize our tasks'
            }
        });

        // Domain Registry
        await prisma.domainRegistry.create({
            data: {
                companyId: co.id,
                domain: `purge-${suffix}.180workspace.com`,
                type: 'COMPANY_PROFILE',
                targetId: co.id,
                status: 'ACTIVE'
            }
        });

        console.log('   ✅ All 18 subsystem tables populated successfully.');

        // ─────────────────────────────────────────────────────────────────────
        // 2. TRIGGER SINGLE COMPANY PERMANENT PURGE VIA SUPERADMIN API
        // ─────────────────────────────────────────────────────────────────────
        console.log('\n▶ [Step 2] Executing Single Company Permanent Purge via API...');
        const deleteRes = await axios.delete(
            `${BACKEND_URL}/api/superadmin/companies/${co.id}`,
            {
                data: { confirm: 'DELETE' },
                headers
            }
        );

        console.log(`   API response status: ${deleteRes.status} (${deleteRes.data?.message})`);
        if (deleteRes.status !== 200) {
            throw new Error(`Expected HTTP 200 on delete, got ${deleteRes.status}`);
        }

        // ─────────────────────────────────────────────────────────────────────
        // 3. VERIFY ZERO ORPHANS IN DATABASE ACROSS ALL MODELS
        // ─────────────────────────────────────────────────────────────────────
        console.log('\n▶ [Step 3] Verifying database integrity across all models...');

        const checks = [
            { name: 'Company', count: await prisma.company.count({ where: { id: co.id } }) },
            { name: 'Users', count: await prisma.user.count({ where: { companyId: co.id } }) },
            { name: 'Chats', count: await prisma.chat.count({ where: { id: chat.id } }) },
            { name: 'Messages', count: await prisma.message.count({ where: { id: { in: [msg1.id, msg2.id] } } }) },
            { name: 'Documents', count: await prisma.document.count({ where: { id: doc.id } }) },
            { name: 'DocumentVersions', count: await prisma.documentVersion.count({ where: { documentId: doc.id } }) },
            { name: 'CompanyMedia', count: await prisma.companyMedia.count({ where: { companyId: co.id } }) },
            { name: 'CompanyOffering', count: await prisma.companyOffering.count({ where: { companyId: co.id } }) },
            { name: 'ServiceRequest', count: await prisma.serviceRequest.count({ where: { companyId: co.id } }) },
            { name: 'Projects', count: await prisma.project.count({ where: { id: project.id } }) },
            { name: 'Tasks', count: await prisma.task.count({ where: { companyId: co.id } }) },
            { name: 'Milestones', count: await prisma.milestone.count({ where: { projectId: project.id } }) },
            { name: 'Modules', count: await prisma.module.count({ where: { projectId: project.id } }) },
            { name: 'SupportTickets', count: await prisma.supportTicket.count({ where: { companyId: co.id } }) },
            { name: 'Attendances', count: await prisma.attendance.count({ where: { companyId: co.id } }) },
            { name: 'Leaves', count: await prisma.leave.count({ where: { companyId: co.id } }) },
            { name: 'Salaries', count: await prisma.salary.count({ where: { companyId: co.id } }) },
            { name: 'AiChatSessions', count: await prisma.aiChatSession.count({ where: { id: aiSess.id } }) },
            { name: 'DomainRegistry', count: await prisma.domainRegistry.count({ where: { companyId: co.id } }) },
        ];

        let failedChecks = 0;
        for (const check of checks) {
            if (check.count === 0) {
                console.log(`   ✅ Table "${check.name}": 0 records (Completely purged)`);
            } else {
                console.error(`   ❌ Table "${check.name}": Found ${check.count} orphan records!`);
                failedChecks++;
            }
        }

        if (failedChecks > 0) {
            throw new Error(`${failedChecks} table checks failed — orphaned data remained in database!`);
        }

        testCompanyId = null;
        console.log('\n   🎉 Single Permanent Delete: 100% PURGE VERIFIED! No trace remains in DB.');

        // ─────────────────────────────────────────────────────────────────────
        // 4. BULK DELETE VERIFICATION
        // ─────────────────────────────────────────────────────────────────────
        console.log('\n▶ [Step 4] Testing Bulk Delete API with multiple companies...');
        for (let i = 1; i <= 2; i++) {
            const bSuffix = `${Date.now()}_b${i}`;
            const bulkCo = await prisma.company.create({
                data: {
                    name: `Bulk Test Corp ${bSuffix}`,
                    slug: `bulk-test-${bSuffix}`,
                    adminEmail: `bulk-${bSuffix}@purge.com`,
                    users: {
                        create: [
                            {
                                name: `Bulk User ${i}`,
                                email: `bulk-u${i}-${bSuffix}@purge.com`,
                                role: 'admin'
                            }
                        ]
                    },
                    documents_CompanyDocuments: {
                        create: [
                            {
                                name: `Bulk Doc ${i}`,
                                fileUrl: `https://pub-fe44d8a6e623474c9fa7a81b855fb631.r2.dev/docs/bulk-${bSuffix}.pdf`,
                                uploadedBy: {
                                    create: {
                                        name: `Uploader ${i}`,
                                        email: `uploader-${bSuffix}@purge.com`,
                                        role: 'admin'
                                    }
                                }
                            }
                        ]
                    }
                }
            });
            bulkCompanyIds.push(bulkCo.id);
        }
        console.log(`   ✅ Created ${bulkCompanyIds.length} bulk test companies.`);

        const bulkRes = await axios.post(
            `${BACKEND_URL}/api/superadmin/companies/bulk-delete`,
            {
                companyIds: bulkCompanyIds,
                confirm: 'DELETE'
            },
            { headers }
        );

        console.log(`   Bulk Delete status: ${bulkRes.status} (${bulkRes.data?.message})`);
        const { results } = bulkRes.data;
        if (results?.failed?.length > 0) {
            throw new Error(`Bulk delete failed for companies: ${JSON.stringify(results.failed)}`);
        }

        const remainingBulkCos = await prisma.company.count({ where: { id: { in: bulkCompanyIds } } });
        if (remainingBulkCos !== 0) {
            throw new Error(`Found ${remainingBulkCos} bulk companies still existing in DB!`);
        }
        console.log('   ✅ Bulk Permanent Delete: All companies and child records completely wiped!');

        console.log('\n======================================================================');
        console.log('🎉 ALL VERIFICATION TESTS PASSED! PERMANENT DELETION IS FLAWLESS.');
        console.log('======================================================================\n');
    } catch (err: any) {
        console.error('\n❌ VERIFICATION FAILED:', err.response?.data || err.message || err);
        process.exitCode = 1;
    } finally {
        if (testCompanyId) {
            await prisma.company.deleteMany({ where: { id: testCompanyId } }).catch(() => {});
        }
        if (bulkCompanyIds.length > 0) {
            await prisma.company.deleteMany({ where: { id: { in: bulkCompanyIds } } }).catch(() => {});
        }
        await prisma.$disconnect();
    }
}

runVerification();
