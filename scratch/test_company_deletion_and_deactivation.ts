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

async function runTests() {
    console.log('======================================================================');
    console.log('🧪 RUNNING VERIFICATION: COMPANY DELETION & DEACTIVATION SUITE');
    console.log('======================================================================\n');

    const token = await generateSuperAdminToken();
    const headers = { Authorization: `Bearer ${token}` };

    let createdSingleCompanyId: string | null = null;
    const bulkCompanyIds: string[] = [];

    try {
        // ─────────────────────────────────────────────────────────────────────
        // 1. CREATE TEST COMPANY WITH ASSOCIATED DATA
        // ─────────────────────────────────────────────────────────────────────
        console.log('▶ [Step 1] Creating a test company with rich associated data in PostgreSQL...');
        const uniqueSuffix = Date.now();
        const testCompany = await prisma.company.create({
            data: {
                name: `E2E Test Corp ${uniqueSuffix}`,
                slug: `e2e-${uniqueSuffix}`,
                website: `https://e2e-${uniqueSuffix}.com`,
                adminEmail: `admin-${uniqueSuffix}@test.com`,
                adminName: `Admin User ${uniqueSuffix}`,
                accountStatus: 'active',
                subscriptionStatus: 'trial',
                users: {
                    create: [
                        {
                            email: `admin-${uniqueSuffix}@test.com`,
                            name: `Admin User ${uniqueSuffix}`,
                            role: 'admin',
                            password: 'hashedpassword123',
                        },
                        {
                            email: `staff-${uniqueSuffix}@test.com`,
                            name: `Staff User ${uniqueSuffix}`,
                            role: 'employee',
                            password: 'hashedpassword123',
                        }
                    ]
                }
            },
            include: { users: true }
        });
        createdSingleCompanyId = testCompany.id;
        console.log(`   ✅ Created Company ID: ${testCompany.id} ("${testCompany.name}") with ${testCompany.users.length} users.`);

        // Add dummy support ticket and client for this company
        const adminUser = testCompany.users[0];
        await prisma.supportTicket.create({
            data: {
                companyId: testCompany.id,
                companyName: testCompany.name,
                userId: adminUser.id,
                userName: adminUser.name,
                userEmail: adminUser.email,
                subject: `Test Ticket for ${testCompany.name}`,
                category: 'technical',
                priority: 'medium',
                status: 'open',
                message: 'Initial test inquiry',
            }
        });

        await prisma.client.create({
            data: {
                companyId: testCompany.id,
                name: `Client of ${testCompany.name}`,
                email: `client-${uniqueSuffix}@domain.com`,
            }
        });

        console.log('   ✅ Associated child records (SupportTicket, Client) created.');

        // ─────────────────────────────────────────────────────────────────────
        // 2. TEST DEACTIVATION (SUSPEND)
        // ─────────────────────────────────────────────────────────────────────
        console.log('\n▶ [Step 2] Testing Company Deactivation / Suspend via API...');
        const suspendRes = await axios.put(
            `${BACKEND_URL}/api/superadmin/companies/${testCompany.id}/suspend`,
            { reason: 'Terms of Service Audit Required' },
            { headers }
        );

        if (suspendRes.status !== 200) {
            throw new Error(`Expected HTTP 200 on suspend, got ${suspendRes.status}`);
        }

        // Verify in DB that accountStatus is 'suspended'
        const suspendedCompany = await prisma.company.findUnique({ where: { id: testCompany.id } });
        if (suspendedCompany?.accountStatus !== 'suspended') {
            throw new Error(`Expected company accountStatus 'suspended', but found '${suspendedCompany?.accountStatus}'`);
        }
        console.log(`   ✅ Deactivation successful! Status in DB is accountStatus: '${suspendedCompany.accountStatus}'`);

        // ─────────────────────────────────────────────────────────────────────
        // 3. TEST ACTIVATION (UNSUSPEND)
        // ─────────────────────────────────────────────────────────────────────
        console.log('\n▶ [Step 3] Testing Company Activation / Unsuspend via API...');
        const unsuspendRes = await axios.put(
            `${BACKEND_URL}/api/superadmin/companies/${testCompany.id}/unsuspend`,
            {},
            { headers }
        );

        if (unsuspendRes.status !== 200) {
            throw new Error(`Expected HTTP 200 on unsuspend, got ${unsuspendRes.status}`);
        }

        // Verify in DB that status is restored to 'active'
        const unsuspendedCompany = await prisma.company.findUnique({ where: { id: testCompany.id } });
        if (unsuspendedCompany?.accountStatus !== 'active') {
            throw new Error(`Expected company accountStatus to be 'active' after unsuspend, got '${unsuspendedCompany?.accountStatus}'`);
        }
        console.log(`   ✅ Activation successful! Status in DB restored to accountStatus: '${unsuspendedCompany?.accountStatus}'.`);

        // ─────────────────────────────────────────────────────────────────────
        // 4. TEST SINGLE PERMANENT DELETE
        // ─────────────────────────────────────────────────────────────────────
        console.log('\n▶ [Step 4] Testing Single Company Permanent Delete via API...');
        const deleteRes = await axios.delete(
            `${BACKEND_URL}/api/superadmin/companies/${testCompany.id}`,
            { 
                data: { confirm: 'DELETE' },
                headers 
            }
        );

        if (deleteRes.status !== 200) {
            throw new Error(`Expected HTTP 200 on delete, got ${deleteRes.status}`);
        }

        // Verify DB records are completely purged
        const deletedCompanyCheck = await prisma.company.findUnique({ where: { id: testCompany.id } });
        const deletedUsersCheck = await prisma.user.findMany({ where: { companyId: testCompany.id } });
        const deletedTicketsCheck = await prisma.supportTicket.findMany({ where: { companyId: testCompany.id } });
        const deletedClientsCheck = await prisma.client.findMany({ where: { companyId: testCompany.id } });

        if (deletedCompanyCheck) {
            throw new Error(`Company record ${testCompany.id} still exists in DB after deletion!`);
        }
        if (deletedUsersCheck.length > 0) {
            throw new Error(`Found ${deletedUsersCheck.length} orphaned users in DB after company deletion!`);
        }
        if (deletedTicketsCheck.length > 0) {
            throw new Error(`Found ${deletedTicketsCheck.length} orphaned tickets in DB after company deletion!`);
        }
        if (deletedClientsCheck.length > 0) {
            throw new Error(`Found ${deletedClientsCheck.length} orphaned clients in DB after company deletion!`);
        }

        console.log('   ✅ Single Permanent Delete verified: Company and ALL related records (Users, Tickets, Clients) completely wiped from database!');
        createdSingleCompanyId = null;

        // ─────────────────────────────────────────────────────────────────────
        // 5. TEST BULK PERMANENT DELETION
        // ─────────────────────────────────────────────────────────────────────
        console.log('\n▶ [Step 5] Testing Bulk Company Permanent Deletion...');
        for (let i = 1; i <= 3; i++) {
            const bSuffix = `${Date.now()}_${i}`;
            const bulkCo = await prisma.company.create({
                data: {
                    name: `Bulk Test Co ${bSuffix}`,
                    slug: `bulk-${bSuffix}`,
                    website: `https://bulk-${bSuffix}.com`,
                    adminEmail: `bulk-admin-${bSuffix}@test.com`,
                    adminName: `Bulk Admin ${i}`,
                    accountStatus: 'active',
                    subscriptionStatus: 'trial',
                    users: {
                        create: [
                            {
                                email: `bulk-admin-${bSuffix}@test.com`,
                                name: `Bulk Admin ${i}`,
                                role: 'admin',
                                password: 'hashedpassword123',
                            }
                        ]
                    }
                }
            });
            bulkCompanyIds.push(bulkCo.id);
        }
        console.log(`   ✅ Seeded ${bulkCompanyIds.length} bulk test companies with users.`);

        const bulkDeleteRes = await axios.post(
            `${BACKEND_URL}/api/superadmin/companies/bulk-delete`,
            {
                companyIds: bulkCompanyIds,
                confirm: 'DELETE'
            },
            { headers }
        );

        if (bulkDeleteRes.status !== 200) {
            throw new Error(`Expected HTTP 200 on bulk-delete, got ${bulkDeleteRes.status}`);
        }

        const { results } = bulkDeleteRes.data;
        console.log(`   API response: ${bulkDeleteRes.data.message}`);
        console.log(`   Success count: ${results?.success?.length}, Failed count: ${results?.failed?.length}`);

        if (results?.failed?.length > 0) {
            throw new Error(`Bulk delete reported ${results.failed.length} failures: ${JSON.stringify(results.failed)}`);
        }

        // Verify none of the bulk companies exist in database
        const remainingBulkCos = await prisma.company.findMany({
            where: { id: { in: bulkCompanyIds } }
        });
        const remainingBulkUsers = await prisma.user.findMany({
            where: { companyId: { in: bulkCompanyIds } }
        });

        if (remainingBulkCos.length > 0) {
            throw new Error(`Found ${remainingBulkCos.length} bulk companies still existing in DB!`);
        }
        if (remainingBulkUsers.length > 0) {
            throw new Error(`Found ${remainingBulkUsers.length} bulk users still existing in DB!`);
        }

        console.log('   ✅ Bulk Permanent Delete verified: All bulk companies and child records completely purged from database!');

        console.log('\n======================================================================');
        console.log('🎉 ALL 5/5 TESTS PASSED SUCCESSFULLY! DELETION & DEACTIVATION ARE PERFECT.');
        console.log('======================================================================\n');
    } catch (err: any) {
        console.error('\n❌ TEST SUITE FAILED:', err.response?.data || err.message || err);
        process.exitCode = 1;
    } finally {
        // Cleanup if any remained due to early failure
        if (createdSingleCompanyId) {
            await prisma.company.deleteMany({ where: { id: createdSingleCompanyId } }).catch(() => {});
        }
        if (bulkCompanyIds.length > 0) {
            await prisma.company.deleteMany({ where: { id: { in: bulkCompanyIds } } }).catch(() => {});
        }
        await prisma.$disconnect();
    }
}

runTests();
