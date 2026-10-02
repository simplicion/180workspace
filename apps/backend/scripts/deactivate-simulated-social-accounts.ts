/**
 * Deactivates demo/simulated social accounts ("180 Workspace Channel (Demo)", "Alex Rivera (Demo)", sandbox
 * accounts) that were connected while a provider ran in mock mode. Their scheduled posts are moved back to draft so
 * nothing tries to publish through a fake token.
 *
 *   npx tsx apps/backend/scripts/deactivate-simulated-social-accounts.ts          # dry run: lists what would change
 *   npx tsx apps/backend/scripts/deactivate-simulated-social-accounts.ts --apply  # performs the change
 *
 * Reads DATABASE_URL from the environment. Run it only against the database you intend to clean.
 */
import { prisma } from '@workspace/db';

const SIMULATED_IDS = ['UC_mock_180_channel', 'urn:li:person:mock_member_180'];

async function main() {
    const apply = process.argv.includes('--apply');
    const db = prisma as any;
    const candidates = await db.socialAccount.findMany({
        where: {
            isActive: true,
            OR: [
                { platformAccountId: { in: SIMULATED_IDS } },
                { metadata: { path: ['simulated'], equals: true } },
                { accountName: { endsWith: '(Demo)' } },
            ],
        },
        select: { id: true, companyId: true, platform: true, accountName: true, platformAccountId: true },
    });
    console.log(`${candidates.length} simulated account(s) found${apply ? '' : ' (dry run; pass --apply to change them)'}:`);
    for (const a of candidates) console.log(`  ${a.platform}  ${a.accountName}  [${a.platformAccountId}]  company=${a.companyId}`);
    if (!apply || !candidates.length) return;

    for (const a of candidates) {
        const paused = await db.socialPost.updateMany({
            where: { companyId: a.companyId, socialAccountId: a.id, status: { in: ['scheduled', 'approved'] } },
            data: { status: 'draft', errorMessage: 'Paused: the connected account was a demo account and has been removed.' },
        });
        await db.socialAccount.updateMany({ where: { id: a.id, companyId: a.companyId }, data: { isActive: false } });
        console.log(`  deactivated ${a.accountName}; ${paused.count} scheduled post(s) moved to draft`);
    }
}

main()
    .catch((err) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(() => (prisma as any).$disconnect?.());
