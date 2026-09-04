import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    await prisma.releaseNote.deleteMany({});
    console.log('Cleared existing release notes.');

    const notes = [
        {
            version: '2.4.0',
            title: 'Live Desk Engineering Chat, Instant Attachments & Lifecycle Purge',
            content: JSON.stringify({
                description: 'Introduced real-time engineering ticket chat, clipboard screenshot paste (Ctrl+V), high-density operational status, and automated multi-tenant database lifecycle management.',
                features: [
                    { name: 'Interactive Engineering Desk', description: 'Real-time WebSocket message exchange with support technicians and engineers.', navLink: '/help-support/tickets' },
                    { name: 'Screenshot Clipboard Integration', description: 'Direct Ctrl+V / Cmd+V screenshot paste, image lightbox inspection, and up to 25MB attachment uploads.', navLink: '/help-support' },
                    { name: 'SuperAdmin Lifecycle Automation', description: 'Instant single & bulk company permanent deletion with 27-table relational cascading erasure.', navLink: '/superadmin/companies' }
                ],
                fixes: [
                    'Optimized modal backdrops with lightweight corporate blur (2px) and crystal clarity',
                    'Fixed delete notification toast clipping under the top navigation bar',
                    'Resolved query profiling performance latency on large multi-tenant datasets'
                ],
                isPublished: true,
            }),
            publishedAt: new Date('2026-09-04'),
        },
        {
            version: '2.3.4',
            title: 'Multi-Tenant Row-Level Security & Infrastructure Hardening',
            content: JSON.stringify({
                description: 'Upgraded tenant isolation models, enhanced PostgreSQL query guardrails, and deployed unified WebSocket connection pools.',
                features: [
                    { name: 'Automatic RLS Context', description: 'Zero cross-tenant data leakage guaranteed via automatic companyId query injection.', navLink: '/settings/system-configs' },
                    { name: 'High-Throughput WebSockets', description: 'Sub-millisecond real-time sync for platform notifications, chat channels, and activity logs.', navLink: '/chat' }
                ],
                fixes: [
                    'Fixed edge case in JWT refresh tokens during long-running background sessions',
                    'Enhanced CORS handling for public Edge Traffic Director tags'
                ],
                isPublished: true,
            }),
            publishedAt: new Date('2026-08-20'),
        },
        {
            version: '2.2.0',
            title: 'Enterprise CRM Pipelines & Automated PDF Invoicing',
            content: JSON.stringify({
                description: 'Full-featured sales pipeline, leads management, multi-currency invoicing, and automated Stripe/PayPal webhook reconciliations.',
                features: [
                    { name: 'Visual Sales Pipeline', description: 'Drag-and-drop deal stages with real-time conversion probability forecasting.', navLink: '/sales/deals' },
                    { name: 'Smart PDF Invoicing', description: 'Branded invoice generation with automated recurring billing schedules.', navLink: '/invoices' }
                ],
                fixes: [
                    'Improved PDF export styling across high-DPI displays',
                    'Accelerated CSV lead import parser by 4x'
                ],
                isPublished: true,
            }),
            publishedAt: new Date('2026-07-15'),
        }
    ];

    for (const n of notes) {
        await prisma.releaseNote.create({ data: n });
    }

    console.log('✅ Successfully seeded 3 release notes into PostgreSQL database!');
    const count = await prisma.releaseNote.count();
    console.log(`Total release notes in DB: ${count}`);

    await prisma.$disconnect();
}

main().catch(console.error);
