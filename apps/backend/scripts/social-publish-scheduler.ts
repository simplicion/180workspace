/**
 * Standalone social publishing scheduler.
 *   npm run social:scheduler                 → poll forever (SOCIAL_SCHEDULER_INTERVAL_MS, default 30s)
 *   npm run social:scheduler -- --once       → one tick, print the result, exit
 *   npm run social:migrate-tokens            → encrypt legacy plaintext SocialAccount tokens into the vault
 * When this runs as its own process, set SOCIAL_SCHEDULER_ENABLED=false on the API/worker so only one kind polls
 * (running both is still safe: posts are claimed with a conditional UPDATE).
 */
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

async function main() {
    const { SocialPublishScheduler, SocialTokenVault, assertTokenVaultConfigured } = await import('@workspace/social-media');
    assertTokenVaultConfigured(); // fail loudly: no key, no publishing

    if (process.argv.includes('--migrate-tokens')) {
        const r = await SocialTokenVault.migrateLegacyPlaintextTokens();
        console.log(`[social] migrated ${r.migrated} legacy plaintext token(s) into the vault`);
        process.exit(0);
    }
    if (process.argv.includes('--once')) {
        console.log(JSON.stringify(await SocialPublishScheduler.tick(), null, 2));
        process.exit(0);
    }
    SocialPublishScheduler.start();
    const stop = () => {
        SocialPublishScheduler.stop();
        process.exit(0);
    };
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
    setInterval(() => undefined, 1 << 30); // keep the process alive
}

main().catch((e) => {
    console.error('[social-publish-scheduler] fatal:', e?.message || e);
    process.exit(1);
});
